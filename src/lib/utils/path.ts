/**
 * URL path segment for a category or tag, matching the existing archive URLs.
 * Do not use slugify() here: it lowercases and strips CJK characters.
 */
export function toPathSegment(name: string): string {
  return name.trim().replace(/\s+/g, '-');
}
