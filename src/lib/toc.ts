/**
 * Build chapter data for the article TOC from Astro's rendered headings.
 * h2 = chapter (numbered from 1), h3 = sub-item of the preceding chapter.
 */

export interface HeadingLike {
  depth: number;
  slug: string;
  text: string;
}

export interface Chapter {
  no: number;
  slug: string;
  text: string;
  children: { slug: string; text: string }[];
}

/** rehype-autolink-headings appends "#" to heading text. */
function cleanText(text: string): string {
  return text.replace(/\s*#+\s*$/, '').trim();
}

export function buildChapters(headings: HeadingLike[]): Chapter[] {
  const chapters: Chapter[] = [];
  for (const h of headings) {
    if (h.depth === 2) {
      chapters.push({ no: chapters.length + 1, slug: h.slug, text: cleanText(h.text), children: [] });
    } else if (h.depth === 3 && chapters.length > 0) {
      chapters[chapters.length - 1].children.push({ slug: h.slug, text: cleanText(h.text) });
    }
  }
  return chapters;
}

export function padChapter(no: number): string {
  return String(no).padStart(2, '0');
}
