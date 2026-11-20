/**
 * Live filter for the tag index (components/post-list/TagBrowser.astro).
 * Safe to call on every page view; does nothing when the browser is absent.
 */
export function initTagFilter(): void {
  const root = document.querySelector<HTMLElement>('[data-tag-browser]');
  const input = root?.querySelector<HTMLInputElement>('[data-tag-filter]');
  if (!root || !input) return;
  const empty = root.querySelector<HTMLElement>('[data-tag-empty]');
  const groups = [...root.querySelectorAll<HTMLElement>('[data-tag-group]')];

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase().replace(/^#/, '');
    let shown = 0;
    for (const group of groups) {
      let inGroup = 0;
      for (const item of group.querySelectorAll<HTMLElement>('[data-tag-name]')) {
        const match = !q || (item.dataset.tagName ?? '').includes(q);
        item.hidden = !match;
        if (match) inGroup++;
      }
      group.hidden = inGroup === 0;
      shown += inGroup;
    }
    empty?.classList.toggle('hidden', shown > 0);
  });
}
