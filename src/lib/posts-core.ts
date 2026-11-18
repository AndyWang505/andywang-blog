/**
 * Pure post helpers. No `astro:content` import, so they can be unit tested.
 * `src/lib/posts.ts` wires them to the content collection.
 * Spec: docs/redesign/05-data.md
 */
import { toPathSegment } from './utils/path';
import { getReadingTime, getWordCount } from './utils/readingTime';

/** Minimal shape of a blog collection entry that the helpers need. */
export interface PostSource {
  slug: string;
  body: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    heroImage?: string;
    tags: string[];
    category: string;
  };
}

export interface Post<E extends PostSource = PostSource> {
  slug: string;
  url: string;
  title: string;
  description: string;
  category: string;
  categoryHref: string;
  tags: string[];
  pubDate: Date;
  updatedDate?: Date;
  /** YYYY.MM.DD, used in lists. */
  dateText: string;
  /** YYYY 年 M 月 D 日, used on the article page. */
  longDate: string;
  isoDate: string;
  readingMinutes: number;
  cover?: string;
  entry: E;
}

export interface Count {
  name: string;
  count: number;
  href: string;
}

const TIME_ZONE = 'Asia/Taipei';

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { y: get('year'), m: get('month'), d: get('day') };
}

export function formatListDate(date: Date): string {
  const { y, m, d } = dateParts(date);
  return `${y}.${m}.${d}`;
}

export function formatLongDate(date: Date): string {
  const { y, m, d } = dateParts(date);
  return `${y} 年 ${Number(m)} 月 ${Number(d)} 日`;
}

export function categoryHref(name: string): string {
  return `/archive/category/${toPathSegment(name)}/`;
}

export function tagHref(name: string): string {
  return `/archive/tag/${toPathSegment(name)}/`;
}

export function toPost<E extends PostSource>(entry: E): Post<E> {
  const { data } = entry;
  const category = data.category.trim();
  const cover = data.heroImage?.trim() || undefined;
  return {
    slug: entry.slug,
    url: `/post/${entry.slug}/`,
    title: data.title,
    description: data.description,
    category,
    categoryHref: categoryHref(category),
    tags: data.tags.map((t) => t.trim()).filter(Boolean),
    pubDate: data.pubDate,
    updatedDate: data.updatedDate,
    dateText: formatListDate(data.pubDate),
    longDate: formatLongDate(data.pubDate),
    isoDate: data.pubDate.toISOString(),
    readingMinutes: getReadingTime(getWordCount(entry.body)),
    cover,
    entry,
  };
}

/** Newest first; same day falls back to title for a stable order. */
export function sortPosts<P extends Pick<Post, 'pubDate' | 'title'>>(posts: P[]): P[] {
  return [...posts].sort(
    (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf() || a.title.localeCompare(b.title),
  );
}

/** Count posts per key (trimmed); sorted by count desc, then name. */
export function countBy(
  posts: Pick<Post, 'category' | 'tags'>[],
  key: 'category' | 'tags',
  href: (name: string) => string,
): Count[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const values = key === 'category' ? [post.category] : post.tags;
    for (const raw of values) {
      const name = raw.trim();
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, count, href: href(name) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function countByYear(posts: Pick<Post, 'pubDate'>[]): { year: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const post of posts) {
    const year = Number(dateParts(post.pubDate).y);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  return [...counts].map(([year, count]) => ({ year, count })).sort((a, b) => b.year - a.year);
}

export interface Series<P> {
  tag: string;
  /** Oldest first. */
  posts: P[];
  /** 1-based position of the given post. */
  index: number;
}

export function pickSeries<P extends Pick<Post, 'slug' | 'tags' | 'pubDate' | 'title'>>(
  post: P,
  all: P[],
  seriesTags: readonly string[],
): Series<P> | undefined {
  const tag = seriesTags.find((t) => post.tags.includes(t));
  if (!tag) return undefined;
  const posts = sortPosts(all.filter((p) => p.tags.includes(tag))).reverse();
  const index = posts.findIndex((p) => p.slug === post.slug) + 1;
  return { tag, posts, index };
}

/** `sorted` must be newest first. prev = older neighbour, next = newer neighbour. */
export function prevNext<P extends Pick<Post, 'slug'>>(sorted: P[], slug: string): { prev?: P; next?: P } {
  const i = sorted.findIndex((p) => p.slug === slug);
  if (i === -1) return {};
  return { prev: sorted[i + 1], next: i > 0 ? sorted[i - 1] : undefined };
}

/** Same tag +2 each, same category +1; excludes self and zero scores. */
export function relatedPosts<P extends Pick<Post, 'slug' | 'tags' | 'category' | 'pubDate'>>(
  current: P,
  all: P[],
  limit: number,
): P[] {
  return all
    .filter((p) => p.slug !== current.slug)
    .map((p) => {
      const shared = p.tags.filter((t) => current.tags.includes(t)).length;
      const score = shared * 2 + (p.category === current.category ? 1 : 0);
      return { p, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.p.pubDate.valueOf() - a.p.pubDate.valueOf())
    .slice(0, limit)
    .map(({ p }) => p);
}
