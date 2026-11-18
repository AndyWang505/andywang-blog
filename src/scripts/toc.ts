/**
 * Chapter TOC behaviour (docs/redesign/03-components.md D4):
 * current/done chapter state, progress, smooth jump, mobile expand/collapse, copy link.
 * Safe to call on every page view; previous listeners are removed first.
 */
import { readingRatio } from './progress';

/** Headings whose top has passed this line (header + mobile TOC bar) count as read. */
const ACTIVE_OFFSET = 130;

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
    for (const t of targets) {
      if (t.el.getBoundingClientRect().top - ACTIVE_OFFSET <= 1) active = t;
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

  const setOpen = (open: boolean, restoreFocus = false) => {
    if (!toggle || !panel) return;
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open && restoreFocus) toggle.focus();
  };
  const onToggle = () => setOpen(!panel?.classList.contains('open'));
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && panel?.classList.contains('open')) setOpen(false, true);
  };

  const onLinkClick = (e: Event) => {
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
    window.clearTimeout(copyTimer);
  };
}
