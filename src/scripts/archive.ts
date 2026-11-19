/**
 * Archive page behaviour (components/post-list/ArchiveTimeline.astro):
 * - scroll progress line over the tree and the current year highlighted in the rail
 * - smooth jumps for rail years and heatmap cells (handled here, not as swup visits)
 * - rows below the fold fade in as they scroll into view
 * - hover preview card on pointer devices
 * Safe to call on every page view; previous listeners are removed first.
 */
let cleanup: (() => void) | undefined;

/** Where "now" is while reading: just below the header, 35% down the viewport. */
const readingLine = () => window.innerHeight * 0.35;

export function initArchive(): void {
  cleanup?.();
  cleanup = undefined;

  const tree = document.querySelector<HTMLElement>('[data-archive]');
  if (!tree) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fill = tree.querySelector<HTMLElement>('[data-archive-fill]');
  const years = [...tree.querySelectorAll<HTMLElement>('[id^="y"]')];
  const railLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/archive/#y"]')];

  // Scroll progress and current year
  let frame = 0;
  const update = () => {
    frame = 0;
    const line = readingLine();
    const rect = tree.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (line - rect.top) / rect.height));
    fill?.style.setProperty('--fill', ratio.toFixed(4));

    let current = years[0]?.id;
    for (const y of years) {
      if (y.getBoundingClientRect().top - line <= 0) current = y.id;
      else break;
    }
    for (const a of railLinks) {
      if (a.hash === `#${current}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  // Same-page jumps: rail years (/archive/#yYYYY) and heatmap cells (#mYYYY-MM)
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = (e.target as Element).closest<HTMLAnchorElement>('a[href*="#"]');
    if (!link || link.pathname !== location.pathname || !link.hash) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target || !tree.contains(target)) return;
    e.preventDefault();
    e.stopPropagation(); // keep swup from treating it as a visit
    target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(history.state, '', link.hash);
  };

  // Reveal rows that start below the fold
  const leaves = [...tree.querySelectorAll<HTMLElement>('.leaf')];
  let observer: IntersectionObserver | undefined;
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const fold = window.innerHeight;
    const pending = leaves.filter((el) => el.getBoundingClientRect().top > fold);
    pending.forEach((el) => el.classList.add('pre-reveal'));
    observer = new IntersectionObserver(
      (entries) => {
        const shown = entries.filter((en) => en.isIntersecting).map((en) => en.target as HTMLElement);
        shown.forEach((el, i) => {
          el.style.transitionDelay = `${Math.min(i, 6) * 45}ms`;
          el.classList.remove('pre-reveal');
          observer?.unobserve(el);
        });
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    pending.forEach((el) => observer?.observe(el));
  }

  // Hover preview (mouse and trackpad only)
  const peek = document.querySelector<HTMLElement>('[data-archive-peek]');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const img = peek?.querySelector<HTMLImageElement>('[data-peek-img]');
  const metaOut = peek?.querySelector<HTMLElement>('[data-peek-meta-out]');
  const titleOut = peek?.querySelector<HTMLElement>('[data-peek-title-out]');
  const descOut = peek?.querySelector<HTMLElement>('[data-peek-desc-out]');
  let shownFor: HTMLElement | null = null;

  const hidePeek = () => {
    shownFor = null;
    peek?.classList.remove('show');
  };
  const placePeek = (entry: HTMLElement) => {
    if (!peek) return;
    const title = entry.querySelector<HTMLElement>('.title') ?? entry;
    const r = title.getBoundingClientRect();
    const gap = 16;
    const width = peek.offsetWidth;
    const height = peek.offsetHeight;
    let left = Math.min(r.left + Math.min(r.width, 420) + gap, window.innerWidth - width - gap);
    left = Math.max(gap, left);
    let top = r.top + r.height / 2 - height / 2;
    top = Math.max(gap + 56, Math.min(top, window.innerHeight - height - gap));
    peek.style.left = `${left}px`;
    peek.style.top = `${top}px`;
  };
  const onOver = (e: MouseEvent) => {
    if (!peek || !canHover.matches) return;
    const entry = (e.target as Element).closest<HTMLElement>('.entry');
    if (!entry || entry === shownFor) return;
    shownFor = entry;
    const cover = entry.dataset.peekCover;
    if (img) {
      img.hidden = !cover;
      if (cover) img.src = cover;
    }
    if (metaOut) metaOut.textContent = entry.dataset.peekMeta ?? '';
    if (titleOut) titleOut.textContent = entry.dataset.peekTitle ?? '';
    if (descOut) descOut.textContent = entry.dataset.peekDesc ?? '';
    peek.hidden = false;
    placePeek(entry);
    requestAnimationFrame(() => peek.classList.add('show'));
  };
  const onOut = (e: MouseEvent) => {
    const to = e.relatedTarget as Element | null;
    if (shownFor && (!to || !shownFor.contains(to))) hidePeek();
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', hidePeek, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  document.addEventListener('click', onClick, true);
  tree.addEventListener('mouseover', onOver);
  tree.addEventListener('mouseout', onOut);

  cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', hidePeek);
    window.removeEventListener('resize', onScroll);
    document.removeEventListener('click', onClick, true);
    tree.removeEventListener('mouseover', onOver);
    tree.removeEventListener('mouseout', onOut);
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    railLinks.forEach((a) => a.removeAttribute('aria-current'));
  };
}
