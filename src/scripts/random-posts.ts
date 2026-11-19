/**
 * Random posts in the right rail (components/rail/RandomPosts.astro): a fresh pick after every
 * swup page view and on "換一批". The first load is picked by the component's inline script.
 */
function pick(root: HTMLElement): void {
  const items = [...root.querySelectorAll<HTMLElement>('[data-random-item]')];
  const n = Number(root.dataset.count) || 3;
  const current = items.filter((el) => !el.hidden);
  // Prefer posts not on screen now, so "換一批" always changes something.
  const pool = items.length - current.length >= n ? items.filter((el) => el.hidden) : items;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const keep = new Set(pool.slice(0, n));
  for (const el of items) el.hidden = !keep.has(el);
}

/** Safe to call on every page view. */
export function initRandomPosts(fromSwup = false): void {
  const root = document.querySelector<HTMLElement>('[data-random-posts]');
  if (!root || root.dataset.bound) return;
  root.dataset.bound = '1';
  if (fromSwup) pick(root);
  root.querySelector('[data-random-shuffle]')?.addEventListener('click', () => pick(root));
}
