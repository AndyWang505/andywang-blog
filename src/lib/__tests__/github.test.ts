import { describe, expect, it, vi } from 'vitest';
import { getGithubRecent, relativeTime, toRepos, type RawRepo } from '../github';

const now = new Date('2026-11-19T00:00:00Z');
const daysAgo = (n: number) => new Date(now.valueOf() - n * 24 * 60 * 60 * 1000).toISOString();

function raw(name: string, extra: Partial<RawRepo> = {}): RawRepo {
  return {
    name,
    html_url: `https://github.com/u/${name}`,
    description: null,
    language: 'TypeScript',
    pushed_at: daysAgo(1),
    fork: false,
    archived: false,
    ...extra,
  };
}

describe('relativeTime', () => {
  it('formats boundaries', () => {
    expect(relativeTime(new Date(daysAgo(0)), now)).toBe('今天');
    expect(relativeTime(new Date(daysAgo(3)), now)).toBe('3 天前');
    expect(relativeTime(new Date(daysAgo(65)), now)).toBe('2 個月前');
    expect(relativeTime(new Date(daysAgo(400)), now)).toBe('1 年前');
  });

  it('never says 0 years between 12 months and a full year', () => {
    expect(relativeTime(new Date(daysAgo(362)), now)).toBe('1 年前');
  });
});

describe('toRepos', () => {
  it('drops forks and archived repos and applies the limit', () => {
    const repos = toRepos(
      [raw('a', { fork: true }), raw('b'), raw('c', { archived: true }), raw('d', { language: null }), raw('e')],
      2,
      now,
    );
    expect(repos.map((r) => r.name)).toEqual(['b', 'd']);
    expect(repos[0].langColor).toBe('#3178c6');
    expect(repos[1].langColor).toBe('var(--color-fg-subtle)');
    expect(repos[0].relative).toBe('1 天前');
  });
});

describe('getGithubRecent', () => {
  it('returns [] instead of throwing when the request fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await expect(getGithubRecent('nobody-offline', 3, failing)).resolves.toEqual([]);
    warn.mockRestore();
  });

  it('returns [] on a non-200 response', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const notFound = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;
    await expect(getGithubRecent('nobody-404', 3, notFound)).resolves.toEqual([]);
    warn.mockRestore();
  });
});
