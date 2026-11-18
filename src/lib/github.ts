/**
 * Recently pushed public repositories, fetched at build time.
 * Any failure returns [] so the build never breaks; the rail section then hides itself.
 * Spec: docs/redesign/05-data.md §3
 */

export interface Repo {
  name: string;
  url: string;
  description?: string;
  language?: string;
  langColor: string;
  pushedAt: Date;
  relative: string;
}

export interface RawRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
}

const LANG_COLORS: Record<string, string> = {
  Shell: '#89e051',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Astro: '#ff5a03',
  'C++': '#f34b7d',
};
const FALLBACK_COLOR = 'var(--color-fg-subtle)';

const DAY = 24 * 60 * 60 * 1000;

export function relativeTime(date: Date, now: Date = new Date()): string {
  const days = Math.floor((now.valueOf() - date.valueOf()) / DAY);
  if (days < 1) return '今天';
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 個月前`;
  return `${Math.floor(days / 365)} 年前`;
}

export function toRepos(raw: RawRepo[], limit: number, now: Date = new Date()): Repo[] {
  return raw
    .filter((r) => !r.fork && !r.archived)
    .slice(0, limit)
    .map((r) => {
      const pushedAt = new Date(r.pushed_at);
      return {
        name: r.name,
        url: r.html_url,
        description: r.description?.trim() || undefined,
        language: r.language ?? undefined,
        langColor: (r.language && LANG_COLORS[r.language]) || FALLBACK_COLOR,
        pushedAt,
        relative: relativeTime(pushedAt, now),
      };
    });
}

const cache = new Map<string, Promise<Repo[]>>();

export function getGithubRecent(user: string, limit = 3, fetchImpl: typeof fetch = fetch): Promise<Repo[]> {
  const key = `${user}:${limit}`;
  let pending = cache.get(key);
  if (!pending) {
    pending = load(user, limit, fetchImpl);
    cache.set(key, pending);
  }
  return pending;
}

async function load(user: string, limit: number, fetchImpl: typeof fetch): Promise<Repo[]> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'andywang-blog-build',
      Accept: 'application/vnd.github+json',
    };
    const token = typeof process !== 'undefined' ? process.env.GITHUB_TOKEN : undefined;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetchImpl(`https://api.github.com/users/${encodeURIComponent(user)}/repos?sort=pushed&per_page=20`, {
      headers,
    });
    if (!res.ok) throw new Error(`GitHub API responded ${res.status}`);
    const data = (await res.json()) as RawRepo[];
    if (!Array.isArray(data)) throw new Error('Unexpected GitHub API response');
    return toRepos(data, limit);
  } catch (error) {
    console.warn(`[github] Skipping recent repos: ${(error as Error).message}`);
    return [];
  }
}
