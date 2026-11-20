/**
 * Mobile menu toggle.
 * Safe to call on every page view; previous listeners are removed first.
 */
let cleanup: (() => void) | undefined;

export function initMobileMenu(): void {
  cleanup?.();
  cleanup = undefined;

  const button = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-mobile-menu]');
  if (!button || !panel) return;

  /** Matches the .leaving animation in MobileMenu.astro. */
  const LEAVE_MS = 150;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let leaveTimer = 0;

  const setOpen = (open: boolean, restoreFocus = false) => {
    window.clearTimeout(leaveTimer);
    panel.classList.remove('entering', 'leaving');
    if (open) {
      panel.hidden = false;
      void panel.offsetWidth; // restart the enter animation
      panel.classList.add('entering');
    } else if (!panel.hidden) {
      if (reduceMotion.matches) panel.hidden = true;
      else {
        panel.classList.add('leaving');
        leaveTimer = window.setTimeout(() => {
          panel.hidden = true;
          panel.classList.remove('leaving');
        }, LEAVE_MS);
      }
    }
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (open) panel.querySelector<HTMLElement>('a')?.focus();
    else if (restoreFocus) button.focus();
  };

  const isOpen = () => !panel.hidden && !panel.classList.contains('leaving');
  const onToggle = () => setOpen(!isOpen());
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false, true);
  };
  const onLink = (e: Event) => {
    if ((e.target as Element).closest('a')) setOpen(false);
  };
  const onResize = () => {
    if (window.innerWidth >= 1024 && isOpen()) setOpen(false);
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
    window.clearTimeout(leaveTimer);
    document.documentElement.style.overflow = '';
  };
}
