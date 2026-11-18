/**
 * Token layering rules (docs/redesign/01-foundations.md §8).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { referencedVariables } from '../../styles/tokens/tailwind-theme.mjs';

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

function exists(dir: string): boolean {
  try {
    return statSync(dir).isDirectory();
  } catch {
    return false;
  }
}

/** Directories of v2 components; legacy components are removed in T12. */
const V2_DIRS = ['ui', 'layout', 'rail', 'home', 'post-list', 'post'].map((d) => join(root, 'src', 'components', d));
/** HomeHero sets white text and a dark credit pill over the photo. */
const HEX_ALLOWED = [/HomeHero\.astro$/];

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

  it('v2 components contain no hard-coded hex colours', () => {
    const offenders = V2_DIRS.filter(exists)
      .flatMap(walk)
      .filter((p) => !HEX_ALLOWED.some((re) => re.test(p)))
      .filter((p) => /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/.test(read(p).replace(/href="#[^"]*"/g, '')));
    expect(offenders).toEqual([]);
  });
});
