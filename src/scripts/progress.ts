/**
 * Reading progress: header bar ([data-reading-progress]) and the TOC bar ([data-toc-bar]).
 * Safe to call on every page view; previous listeners are removed first.
 */
let cleanup: (() => void) | undefined;

export function readingRatio(): number {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

export function initProgress(): void {
  cleanup?.();
  cleanup = undefined;

  const bar = document.querySelector<HTMLElement>('[data-reading-progress]');
  if (!bar) return;

  let frame = 0;
  const update = () => {
    frame = 0;
    bar.style.width = `${(readingRatio() * 100).toFixed(2)}%`;
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
    if (frame) cancelAnimationFrame(frame);
  };
}
