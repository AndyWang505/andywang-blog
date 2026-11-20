/**
 * Post data for components. Components call these instead of `getCollection` directly.
 * Results are cached for the duration of a build.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { SITE_SERIES } from '../config/site';
import {
  categoryHref,
  countBy,
  countByYear,
  pickSeries,
  prevNext,
  relatedPosts,
  sortPosts,
  tagHref,
  toPost,
  type Count,
  type Post as CorePost,
  type Series,
} from './posts-core';

export type Post = CorePost<CollectionEntry<'blog'>>;
export type { Count, Series };
export { categoryHref, tagHref };

let cache: Promise<Post[]> | undefined;

/** All posts, newest first. `isDraft` is not filtered (keeps current behaviour). */
export function getSortedPosts(): Promise<Post[]> {
  cache ??= getCollection('blog').then((entries) => sortPosts(entries.map(toPost)));
  return cache;
}

export async function getCategoryCounts(): Promise<Count[]> {
  return countBy(await getSortedPosts(), 'category', categoryHref);
}

export async function getTagCounts(): Promise<Count[]> {
  return countBy(await getSortedPosts(), 'tags', tagHref);
}

export async function getYearCounts(): Promise<{ year: number; count: number }[]> {
  return countByYear(await getSortedPosts());
}

export async function getSeriesOf(post: Post): Promise<Series<Post> | undefined> {
  return pickSeries(post, await getSortedPosts(), SITE_SERIES);
}

export async function getPrevNext(slug: string): Promise<{ prev?: Post; next?: Post }> {
  return prevNext(await getSortedPosts(), slug);
}

export async function getRelatedPosts(slug: string, limit = 3): Promise<Post[]> {
  const all = await getSortedPosts();
  const current = all.find((p) => p.slug === slug);
  return current ? relatedPosts(current, all, limit) : [];
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  return (await getSortedPosts()).find((p) => p.slug === slug);
}
