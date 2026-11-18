import { describe, expect, it } from 'vitest';
import { buildChapters, padChapter } from '../toc';

describe('buildChapters', () => {
  it('nests h3 under the preceding h2 and numbers h2 from 1', () => {
    const chapters = buildChapters([
      { depth: 3, slug: 'orphan', text: 'Orphan' },
      { depth: 2, slug: 'a', text: 'A#' },
      { depth: 3, slug: 'a1', text: 'A1 #' },
      { depth: 4, slug: 'deep', text: 'Deep' },
      { depth: 2, slug: 'b', text: 'B' },
    ]);
    expect(chapters).toEqual([
      { no: 1, slug: 'a', text: 'A', children: [{ slug: 'a1', text: 'A1' }] },
      { no: 2, slug: 'b', text: 'B', children: [] },
    ]);
  });

  it('handles 0, 1 and 6 chapters', () => {
    expect(buildChapters([])).toHaveLength(0);
    expect(buildChapters([{ depth: 2, slug: 'x', text: 'X' }])).toHaveLength(1);
    const six = Array.from({ length: 6 }, (_, i) => ({ depth: 2, slug: `s${i}`, text: `S${i}` }));
    expect(buildChapters(six).map((c) => c.no)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('pads chapter numbers', () => {
    expect(padChapter(3)).toBe('03');
    expect(padChapter(12)).toBe('12');
  });
});
