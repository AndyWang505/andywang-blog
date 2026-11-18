/**
 * Mobile menu toggle (docs/redesign/02-layout.md §6).
 * Safe to call on every page view; previous listeners are removed first.
 */
let cleanup: (() => void) | undefined;

export function initMobileMenu(): void {
  cleanup?.();
  cleanup = undefined;

  const button = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-mobile-menu]');
  if (!button || !panel) return;

  const setOpen = (open: boolean, restoreFocus = false) => {
    panel.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) panel.querySelector<HTMLElement>('a')?.focus();
    else if (restoreFocus) button.focus();
  };

  const onToggle = () => setOpen(panel.hidden);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !panel.hidden) setOpen(false, true);
  };
  const onLink = (e: Event) => {
    if ((e.target as Element).closest('a')) setOpen(false);
  };
  const onResize = () => {
    if (window.innerWidth >= 1024 && !panel.hidden) setOpen(false);
  };

  button.addEventListener('click', onToggle);
  panel.addEventListener('click', onLink);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  cleanup = () => {
    button.removeEventListener('click', onToggle);
    panel.removeEventListener('click', onLink);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    document.documentElement.style.overflow = '';
  };
}
