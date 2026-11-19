/**
 * Styling ownership rules: a component's look comes only from the component
 * itself and the design tokens; pages and parents only place components.
 *
 * Each rule lists the files that currently break it (KNOWN). A new offender
 * fails the test, and so does fixing a known file without removing it from
 * the list, so the lists always describe the current state and only shrink.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const src = join(root, 'src');
const read = (p: string) => readFileSync(p, 'utf8');
const rel = (p: string) => relative(src, p).split(sep).join('/');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const COMPONENT_DIRS = ['ui', 'layout', 'rail', 'home', 'post-list', 'post'].map((d) => join(src, 'components', d));
/** Standalone pages with their own design; not part of the v2 system. */
const EXCLUDED = [/^pages\/link\//, /^pages\/404\.astro$/];

const componentFiles = COMPONENT_DIRS.flatMap(walk).filter((p) => p.endsWith('.astro'));
const pageFiles = walk(join(src, 'pages'))
  .filter((p) => p.endsWith('.astro'))
  .filter((p) => !EXCLUDED.some((re) => re.test(rel(p))));
const layoutFiles = ['Layout.astro', 'Post.astro'].map((f) => join(src, 'layouts', f));
const v2Files = [...componentFiles, ...pageFiles, ...layoutFiles];

/** Files (relative to src/) whose source matches `test`. */
function offenders(files: string[], test: (source: string) => boolean): string[] {
  return files
    .filter((p) => test(read(p)))
    .map(rel)
    .sort();
}

/** Contents of every static class attribute: class="..." and string literals inside class:list={...}. */
function classStrings(source: string): string[] {
  const plain = [...source.matchAll(/\bclass="([^"]*)"/g)].map((m) => m[1]);
  const lists = [...source.matchAll(/class:list=\{([^}]*)\}/g)].flatMap((m) =>
    [...m[1].matchAll(/'([^']*)'|"([^"]*)"/g)].map((s) => s[1] ?? s[2]),
  );
  return [...plain, ...lists];
}

const TAILWIND_PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const RAW_COLOR = new RegExp(
  `\\b(?:text|bg|border|ring|fill|stroke|from|via|to|divide|outline|decoration|placeholder|shadow)-(?:${TAILWIND_PALETTE})-\\d{2,3}\\b`,
);

describe('styling ownership rules', () => {
  it('components do not accept class or style props', () => {
    const KNOWN: string[] = [];
    // A Props member named class or style, destructuring `class: alias` from Astro.props,
    // or a catch-all `[attr: string]` member that would let class/style through a rest spread.
    const found = offenders(componentFiles, (s) => {
      const frontmatter = s.split('---')[1] ?? '';
      return (
        /^\s*['"]?(?:class|style)['"]?\??\s*:/m.test(frontmatter) ||
        /[{,]\s*class\s*:\s*\w+[^}]*}\s*=\s*Astro\.props/.test(frontmatter) ||
        /\[\s*\w+\s*:\s*string\s*\]/.test(frontmatter)
      );
    });
    expect(found).toEqual(KNOWN);
  });

  it('no :global( in v2 files', () => {
    const KNOWN: string[] = [];
    expect(offenders(v2Files, (s) => s.includes(':global('))).toEqual(KNOWN);
  });

  it('no !important or Tailwind ! prefix in v2 files', () => {
    const KNOWN: string[] = [];
    const found = offenders(v2Files, (s) => /!important/.test(s) || classStrings(s).some((c) => /(?:^|\s)!\S/.test(c)));
    expect(found).toEqual(KNOWN);
  });

  it('no raw Tailwind palette colours or dark: variants in v2 files', () => {
    const KNOWN = ['pages/about.astro'];
    const found = offenders(v2Files, (s) => classStrings(s).some((c) => RAW_COLOR.test(c) || /(?:^|\s)dark:/.test(c)));
    expect(found).toEqual(KNOWN.sort());
  });

  it('no arbitrary text-[size] in v2 files', () => {
    const KNOWN: string[] = [];
    expect(offenders(v2Files, (s) => /\btext-\[\d/.test(s))).toEqual(KNOWN);
  });

  it('no hard-coded style="..." in v2 files', () => {
    const KNOWN: string[] = [];
    expect(offenders(v2Files, (s) => /\sstyle="/.test(s))).toEqual(KNOWN);
  });

  it('the v1 base.css is not loaded', () => {
    const KNOWN = ['components/BaseHead.astro'];
    const all = walk(src).filter((p) => /\.(astro|ts|tsx|mjs|css)$/.test(p) && !p.includes('__tests__'));
    expect(offenders(all, (s) => /['"][^'"]*base\.css['"]/.test(s))).toEqual(KNOWN);
  });

  it('dark theme keeps the light theme text hierarchy', () => {
    const semantic = read(join(src, 'styles', 'tokens', 'semantic.css'));
    const [lightPart, darkPart] = semantic.split('html.dark');
    const values = (css: string) =>
      Object.fromEntries([...css.matchAll(/--(color-fg-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
    const light = values(lightPart);
    const dark = values(darkPart);
    const names = Object.keys(light);
    expect(names.length).toBeGreaterThan(1);
    const collapsed: string[] = [];
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++) {
        const [a, b] = [names[i], names[j]];
        if (light[a] !== light[b] && dark[a] !== undefined && dark[a] === dark[b]) collapsed.push(`${a} = ${b}`);
      }
    expect(collapsed).toEqual([]);
  });
});
