/**
 * Token layering rules (written out in src/styles/tokens/index.css).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { breakpoints, centerBreakpoints, referencedVariables } from '../../styles/tokens/tailwind-theme.mjs';

const root = process.cwd();
const tokenDir = join(root, 'src', 'styles', 'tokens');
const read = (p: string) => readFileSync(p, 'utf8');
const tokenFiles = ['primitives.css', 'semantic.css', 'components.css'].map((f) => join(tokenDir, f));

function definedIn(css: string): Set<string> {
  return new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1].slice(2)));
}

/** Body of the first rule whose selector line equals `selector`. */
function ruleBody(css: string, selector: string): string {
  const lines = css.split(/\r?\n/);
  const start = lines.findIndex((l) => l.trim() === `${selector} {`);
  if (start === -1) return '';
  const end = lines.findIndex((l, i) => i > start && l.trim() === '}');
  return lines.slice(start + 1, end).join('\n');
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Directories that must take colors from tokens. */
const HEX_DIRS = ['components', 'layouts', 'pages'].map((d) => join(root, 'src', d));
/** Files allowed to hard-code colors, each on purpose. */
const HEX_ALLOWED = [
  /HomeHero\.astro$/, // white text and a dark credit pill over the photo, same in both themes
  /[\\/]pages[\\/]404\.astro$/, // Windows blue-screen parody: fixed #0078d7 look, deliberately not themed
  /[\\/]pages[\\/]link[\\/]/, // standalone link page with its own fixed black design
];
/** The link page is a standalone design with its own breakpoints, outside the site layout. */
const BREAKPOINT_EXEMPT = [/[\\/]pages[\\/]link[\\/]/];

/** Every source file under src/, tests excluded. */
function sourceFiles(): string[] {
  return walk(join(root, 'src')).filter((p) => /\.(astro|css|ts|tsx|mjs)$/.test(p) && !p.includes('__tests__'));
}

/** px values in a query that are not in `allowed` (a max-width query may use value - 0.02). */
function strayPx(query: string, allowed: number[]): number[] {
  return [...query.matchAll(/(\d+(?:\.\d+)?)px/g)]
    .map((m) => Number(m[1]))
    .filter((px) => !allowed.includes(px) && !allowed.includes(Number((px + 0.02).toFixed(2))));
}

describe('design tokens', () => {
  const defined = new Set(tokenFiles.flatMap((f) => [...definedIn(read(f))]));

  it('every variable referenced by the Tailwind theme is defined', () => {
    const missing = referencedVariables().filter((name: string) => !defined.has(name));
    expect(missing).toEqual([]);
  });

  it('every light --color-* token has a dark counterpart', () => {
    const semantic = read(join(tokenDir, 'semantic.css'));
    const light = [...semantic.split('/* ===== Light theme (Apple) ===== */')[1].split('html.dark')[0].matchAll(/--(color-[\w-]+)\s*:/g)].map((m) => m[1]);
    const dark = definedIn(ruleBody(semantic, 'html.dark'));
    expect(light.length).toBeGreaterThan(0);
    expect(light.filter((n) => !dark.has(n))).toEqual([]);
  });

  it('--palette-* is only used inside the token files', () => {
    const offenders = walk(join(root, 'src'))
      .filter((p) => /\.(astro|css|ts|tsx|mjs)$/.test(p))
      .filter((p) => !p.startsWith(tokenDir) && !p.includes('__tests__'))
      .filter((p) => read(p).includes('--palette-'));
    expect(offenders).toEqual([]);
  });

  it('components, layouts and pages contain no hard-coded hex colours', () => {
    const offenders = HEX_DIRS.flatMap(walk)
      .filter((p) => !HEX_ALLOWED.some((re) => re.test(p)))
      .filter((p) => /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/.test(read(p).replace(/href="#[^"]*"/g, '')))
      .map((p) => relative(root, p));
    expect(offenders).toEqual([]);
  });

  it('media and container queries only use the shared breakpoints', () => {
    const media = Object.values(breakpoints) as number[];
    const offenders = sourceFiles()
      .filter((p) => !BREAKPOINT_EXEMPT.some((re) => re.test(p)))
      .flatMap((p) => {
        const src = read(p);
        const mediaQueries = [...src.matchAll(/@media([^{]*)\{/g), ...src.matchAll(/matchMedia\(\s*['"`]([^'"`]*)/g)];
        const containerQueries = [...src.matchAll(/@container\s+center([^{]*)\{/g)];
        return [
          ...mediaQueries.flatMap((m) => strayPx(m[1], media)),
          ...containerQueries.flatMap((m) => strayPx(m[1], centerBreakpoints)),
        ].map((px) => `${relative(root, p)}: ${px}px`);
      });
    expect(offenders).toEqual([]);
  });
});
