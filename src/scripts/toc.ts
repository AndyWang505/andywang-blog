/**
 * Chapter TOC behaviour (docs/redesign/03-components.md D4):
 * current/done chapter state, progress, smooth jump, mobile expand/collapse, copy link,
 * back to top (eased, cancellable scroll).
 * Safe to call on every page view; previous listeners are removed first.
 */
import { readingRatio } from './progress';

/**
 * A heading becomes current once its top passes this line: below the header and
 * mobile TOC bar (130px), or the upper 30% of the viewport on tall screens.
 */
const activeLine = () => Math.max(130, window.innerHeight * 0.3);

let cleanup: (() => void) | undefined;

const pad = (n: number) => String(n).padStart(2, '0');

export function initToc(): void {
  cleanup?.();
  cleanup = undefined;

  const root = document.querySelector<HTMLElement>('[data-toc]');
  if (!root) return;

  const total = Number(root.dataset.total) || 0;
  const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-toc-link]')];
  const chapterLinks = links.filter((a) => !a.classList.contains('sub'));
  const targets = links
    .map((a) => ({ link: a, el: document.getElementById(a.dataset.tocLink ?? '') }))
    .filter((t): t is { link: HTMLAnchorElement; el: HTMLElement } => t.el !== null);
  const toggle = root.querySelector<HTMLButtonElement>('[data-toc-toggle]');
  const panel = root.querySelector<HTMLElement>('[data-toc-panel]');
  const currentLabel = root.querySelector<HTMLElement>('[data-toc-current]');
  const counts = root.querySelectorAll<HTMLElement>('[data-toc-count]');
  const bar = root.querySelector<HTMLElement>('[data-toc-bar]');
  const progress = root.querySelector<HTMLElement>('[data-toc-progress]');
  const copyButton = root.querySelector<HTMLButtonElement>('[data-copy-link]');
  const copyLabel = root.querySelector<HTMLElement>('[data-copy-label]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let frame = 0;
  const update = () => {
    frame = 0;
    let active = targets[0];
    const line = activeLine();
    for (const t of targets) {
      if (t.el.getBoundingClientRect().top - line <= 1) active = t;
      else break;
    }
    const chapterNo = Number(active?.link.dataset.chapter) || 1;

    for (const link of links) {
      const isActive = link === active?.link || (link.classList.contains('sub') ? false : Number(link.dataset.chapter) === chapterNo);
      link.classList.toggle('on', isActive);
      link.classList.toggle('done', Number(link.dataset.chapter) < chapterNo);
      if (isActive) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }

    const chapterLink = chapterLinks.find((a) => Number(a.dataset.chapter) === chapterNo);
    const title = chapterLink?.querySelector('span')?.textContent ?? '';
    if (currentLabel) currentLabel.textContent = `${pad(chapterNo)} · ${title}`;
    counts.forEach((c) => (c.textContent = `${chapterNo} / ${total}`));

    const pct = Math.round(readingRatio() * 100);
    if (bar) bar.style.width = `${pct}%`;
    progress?.setAttribute('aria-valuenow', String(pct));
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  /** Matches the .closing fold animation in ChapterToc.astro. */
  const FOLD_MS = 150;
  let foldTimer = 0;
  const isOpen = () => !!panel?.classList.contains('open') && !panel.classList.contains('closing');
  const setOpen = (open: boolean, restoreFocus = false) => {
    if (!toggle || !panel) return;
    window.clearTimeout(foldTimer);
    panel.classList.remove('closing');
    if (open) panel.classList.add('open');
    else if (panel.classList.contains('open')) {
      // The desktop column is always visible; only the mobile panel folds.
      if (reduceMotion.matches || window.innerWidth >= 1024) panel.classList.remove('open');
      else {
        panel.classList.add('closing');
        foldTimer = window.setTimeout(() => panel.classList.remove('open', 'closing'), FOLD_MS);
      }
    }
    toggle.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) toggle.focus();
  };
  const onToggle = () => setOpen(!isOpen());
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) setOpen(false, true);
  };

  // Back to top: an eased scroll whose length follows the distance, cancelled as soon as the
  // reader scrolls, touches or presses a key; the arrow launches; focus lands on the title.
  let toTopFrame = 0;
  const stopToTop = () => {
    if (toTopFrame) cancelAnimationFrame(toTopFrame);
    toTopFrame = 0;
    window.removeEventListener('wheel', stopToTop);
    window.removeEventListener('touchstart', stopToTop);
    window.removeEventListener('keydown', stopToTop);
  };
  const focusTitle = () => {
    const title = document.querySelector<HTMLElement>('#main h1');
    if (!title) return;
    if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  };
  const backToTop = (button: HTMLElement) => {
    setOpen(false);
    history.replaceState(history.state, '', location.pathname + location.search);
    button.classList.remove('launch');
    void button.offsetWidth; // restart the arrow animation
    button.classList.add('launch');
    stopToTop();
    const from = window.scrollY;
    if (reduceMotion.matches || from < 2) {
      window.scrollTo(0, 0);
      focusTitle();
      return;
    }
    const duration = Math.min(800, 300 + Math.sqrt(from) * 8);
    const start = performance.now();
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, Math.round(from * (1 - ease(t))));
      if (t < 1) toTopFrame = requestAnimationFrame(step);
      else {
        stopToTop();
        focusTitle();
      }
    };
    window.addEventListener('wheel', stopToTop, { passive: true });
    window.addEventListener('touchstart', stopToTop, { passive: true });
    window.addEventListener('keydown', stopToTop);
    toTopFrame = requestAnimationFrame(step);
  };

  const onLinkClick = (e: Event) => {
    const top = (e.target as Element).closest<HTMLElement>('[data-back-top]');
    if (top) {
      e.preventDefault();
      e.stopPropagation(); // the eased scroll replaces the #main jump (the link also has data-no-swup)
      backToTop(top);
      return;
    }
    const link = (e.target as Element).closest<HTMLAnchorElement>('[data-toc-link]');
    if (!link) return;
    const target = document.getElementById(link.dataset.tocLink ?? '');
    if (!target) return;
    e.preventDefault();
    setOpen(false);
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', `#${encodeURIComponent(link.dataset.tocLink ?? '')}`);
  };

  let copyTimer = 0;
  const onCopy = async () => {
    if (!copyLabel) return;
    try {
      await navigator.clipboard.writeText(location.href.split('#')[0]);
      copyLabel.textContent = '已複製';
    } catch {
      copyLabel.textContent = '無法複製';
    }
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => (copyLabel.textContent = '複製連結'), 1500);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  toggle?.addEventListener('click', onToggle);
  document.addEventListener('keydown', onKey);
  root.addEventListener('click', onLinkClick);
  copyButton?.addEventListener('click', onCopy);

  cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    toggle?.removeEventListener('click', onToggle);
    document.removeEventListener('keydown', onKey);
    root.removeEventListener('click', onLinkClick);
    copyButton?.removeEventListener('click', onCopy);
    if (frame) cancelAnimationFrame(frame);
    stopToTop();
    window.clearTimeout(foldTimer);
    window.clearTimeout(copyTimer);
  };
}
