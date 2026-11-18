import { describe, expect, it } from 'vitest';
import {
  countBy,
  countByYear,
  formatListDate,
  formatLongDate,
  pickSeries,
  prevNext,
  relatedPosts,
  sortPosts,
  tagHref,
  toPost,
  type PostSource,
} from '../posts-core';

function entry(slug: string, date: string, extra: Partial<PostSource['data']> = {}): PostSource {
  return {
    slug,
    body: '測試內容',
    data: {
      title: slug,
      description: `${slug} desc`,
      pubDate: new Date(`${date}T12:00:00+08:00`),
      tags: [],
      category: 'Dev',
      ...extra,
    },
  };
}

describe('toPost', () => {
  it('builds urls, dates and trims category/tags', () => {
    const p = toPost(entry('hello', '2025-08-07', { category: 'Development ', tags: [' X-Driven', 'Test'], heroImage: '' }));
    expect(p.url).toBe('/post/hello/');
    expect(p.category).toBe('Development');
    expect(p.categoryHref).toBe('/archive/category/Development/');
    expect(p.tags).toEqual(['X-Driven', 'Test']);
    expect(p.dateText).toBe('2025.08.07');
    expect(p.longDate).toBe('2025 年 8 月 7 日');
    expect(p.cover).toBeUndefined();
    expect(p.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it('keeps CJK in path segments', () => {
    expect(tagHref('心得')).toBe('/archive/tag/心得/');
  });
});

describe('dates', () => {
  it('formats in Asia/Taipei', () => {
    const d = new Date('2025-11-01T00:30:00+08:00');
    expect(formatListDate(d)).toBe('2025.11.01');
    expect(formatLongDate(d)).toBe('2025 年 11 月 1 日');
  });
});

describe('sortPosts', () => {
  it('sorts newest first and by title on the same day', () => {
    const posts = [entry('b', '2025-01-01'), entry('c', '2025-03-01'), entry('a', '2025-01-01')].map(toPost);
    expect(sortPosts(posts).map((p) => p.slug)).toEqual(['c', 'a', 'b']);
  });
});

describe('countBy', () => {
  it('merges names that differ only by whitespace', () => {
    const posts = [
      entry('a', '2025-01-01', { category: 'Development' }),
      entry('b', '2025-01-02', { category: 'Development ' }),
      entry('c', '2025-01-03', { category: 'Git' }),
    ].map(toPost);
    expect(countBy(posts, 'category', (n) => n)).toEqual([
      { name: 'Development', count: 2, href: 'Development' },
      { name: 'Git', count: 1, href: 'Git' },
    ]);
  });

  it('counts tags', () => {
    const posts = [entry('a', '2025-01-01', { tags: ['A', 'B'] }), entry('b', '2025-01-02', { tags: ['A'] })].map(toPost);
    expect(countBy(posts, 'tags', (n) => n).map((c) => [c.name, c.count])).toEqual([
      ['A', 2],
      ['B', 1],
    ]);
  });
});

describe('countByYear', () => {
  it('groups by year, newest first', () => {
    const posts = [entry('a', '2024-05-01'), entry('b', '2025-01-01'), entry('c', '2025-02-01')].map(toPost);
    expect(countByYear(posts)).toEqual([
      { year: 2025, count: 2 },
      { year: 2024, count: 1 },
    ]);
  });
});

describe('pickSeries', () => {
  const all = sortPosts(
    [
      entry('tdd', '2025-10-04', { tags: ['X-Driven'] }),
      entry('ddd', '2025-09-20', { tags: ['X-Driven', 'Other'] }),
      entry('bdd', '2025-11-01', { tags: ['X-Driven'] }),
      entry('solo', '2025-01-01', { tags: ['Other'] }),
    ].map(toPost),
  );
  const find = (slug: string) => all.find((p) => p.slug === slug)!;

  it('returns the series oldest first with the 1-based index', () => {
    const s = pickSeries(find('bdd'), all, ['X-Driven'])!;
    expect(s.tag).toBe('X-Driven');
    expect(s.posts.map((p) => p.slug)).toEqual(['ddd', 'tdd', 'bdd']);
    expect(s.index).toBe(3);
  });

  it('returns undefined when the post is not in a series', () => {
    expect(pickSeries(find('solo'), all, ['X-Driven'])).toBeUndefined();
  });

  it('uses the first matching tag in priority order', () => {
    expect(pickSeries(find('ddd'), all, ['Other', 'X-Driven'])!.tag).toBe('Other');
  });
});

describe('prevNext', () => {
  const sorted = sortPosts([entry('old', '2024-01-01'), entry('mid', '2024-06-01'), entry('new', '2025-01-01')].map(toPost));

  it('links older as prev and newer as next', () => {
    const { prev, next } = prevNext(sorted, 'mid');
    expect(prev?.slug).toBe('old');
    expect(next?.slug).toBe('new');
  });

  it('has no next for the newest and no prev for the oldest', () => {
    expect(prevNext(sorted, 'new').next).toBeUndefined();
    expect(prevNext(sorted, 'old').prev).toBeUndefined();
  });
});

describe('relatedPosts', () => {
  it('scores shared tags (+2) and category (+1), excluding self and zero scores', () => {
    const all = [
      entry('cur', '2025-01-01', { tags: ['A', 'B'], category: 'X' }),
      entry('twoTags', '2024-01-01', { tags: ['A', 'B'], category: 'Y' }),
      entry('sameCat', '2024-02-01', { tags: [], category: 'X' }),
      entry('none', '2024-03-01', { tags: ['Z'], category: 'Y' }),
    ].map(toPost);
    expect(relatedPosts(all[0], all, 3).map((p) => p.slug)).toEqual(['twoTags', 'sameCat']);
  });
});
