/**
 * Post taxonomy rules: every post has one of the five categories and 1–3 tags from ALLOWED_TAGS.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_TAGS, ARCHIVE_THEMES } from '../../config/site';

const blogDir = join(process.cwd(), 'src', 'content', 'blog');

interface PostMeta {
  file: string;
  category: string | undefined;
  tags: string[];
}

/** Reads `category` and the single-line `tags` array from each post's frontmatter. */
function readPosts(): PostMeta[] {
  return readdirSync(blogDir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const frontmatter = readFileSync(join(blogDir, file), 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
      const category = frontmatter.match(/^category:\s*['"]([^'"]*)['"]/m)?.[1];
      const tagList = frontmatter.match(/^tags:\s*\[(.*)\]/m)?.[1] ?? '';
      const tags = [...tagList.matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]);
      return { file, category, tags };
    });
}

const allowed: readonly string[] = [...ALLOWED_TAGS.tech, ...ALLOWED_TAGS.topic];
const categories = ARCHIVE_THEMES.flatMap((t) => t.categories ?? []);

describe('post taxonomy', () => {
  const posts = readPosts();

  it('finds the posts', () => {
    expect(posts.length).toBeGreaterThan(0);
  });

  it('every tag is in ALLOWED_TAGS', () => {
    const offenders = posts
      .map((p) => ({ file: p.file, tags: p.tags.filter((t) => !allowed.includes(t)) }))
      .filter((p) => p.tags.length > 0)
      .map((p) => `${p.file}: ${p.tags.join(', ')}`);
    expect(offenders).toEqual([]);
  });

  it('every post has 1 to 3 tags', () => {
    const offenders = posts.filter((p) => p.tags.length < 1 || p.tags.length > 3).map((p) => `${p.file}: ${p.tags.length}`);
    expect(offenders).toEqual([]);
  });

  it('every post uses one of the archive theme categories', () => {
    const offenders = posts.filter((p) => !p.category || !categories.includes(p.category)).map((p) => `${p.file}: ${p.category}`);
    expect(offenders).toEqual([]);
  });

  it('ALLOWED_TAGS has no duplicates, even ignoring case', () => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const tag of allowed) {
      const key = tag.toLowerCase();
      if (seen.has(key)) clashes.push(`${seen.get(key)} / ${tag}`);
      else seen.set(key, tag);
    }
    expect(clashes).toEqual([]);
  });
});
