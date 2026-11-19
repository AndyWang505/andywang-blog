/**
 * Archive page behaviour (components/post-list/ArchiveTimeline.astro):
 * - posts above the reading line marked as passed (accent dot and spine), current year in the rail
 * - smooth jumps for rail years and heatmap cells (handled here, not as swup visits)
 * - rows below the fold fade in as they scroll into view
 * - wide layout: a reader card that follows the reading line, or the hovered post
 * - narrower layouts: hover preview card beside the list on pointer devices from 1024px
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
  const years = [...tree.querySelectorAll<HTMLElement>('h2[id^="y"]')];
  const rows = [...tree.querySelectorAll<HTMLElement>('[data-archive-row]')];
  const railLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/archive/#y"]')];

  // Reader card (wide layout): shows the current row, or the hovered one
  const reader = tree.querySelector<HTMLElement>('[data-archive-reader]');
  const readerLink = reader?.querySelector<HTMLAnchorElement>('[data-reader-link]');
  const readerImg = reader?.querySelector<HTMLImageElement>('[data-reader-img]');
  const readerMeta = reader?.querySelector<HTMLElement>('[data-reader-meta]');
  const readerTitle = reader?.querySelector<HTMLElement>('[data-reader-title]');
  const readerDesc = reader?.querySelector<HTMLElement>('[data-reader-desc]');
  const readerShown = () => !!reader && getComputedStyle(reader).display !== 'none';
  let readerFor: HTMLElement | null = null;
  let hovered: HTMLElement | null = null;
  let currentRow: HTMLElement | null = null;

  const dotY = (row: Element) => {
    const r = (row.querySelector('.dot') ?? row).getBoundingClientRect();
    return r.top + r.height / 2;
  };
  /** Aim the card's connector at the shown post's dot; hide it when the dot is beside neither card edge. */
  const pointConnector = () => {
    if (!readerLink || !readerFor || !readerShown()) return;
    const row = readerFor.closest('[data-archive-row]');
    if (!row) return;
    const card = readerLink.getBoundingClientRect();
    const y = dotY(row) - card.top;
    const inside = y >= 12 && y <= card.height - 12;
    readerLink.style.setProperty('--link-y', `${Math.round(y)}px`);
    readerLink.style.setProperty('--link-on', inside ? '1' : '0');
  };

  /** Ring, connector and card always point at the same post. */
  const setFocus = (row: HTMLElement | null) => {
    if (row !== currentRow) {
      currentRow?.classList.remove('current');
      row?.classList.add('current');
      currentRow = row;
    }
    if (readerShown()) showInReader(currentRow?.querySelector<HTMLElement>('.entry') ?? null);
    pointConnector();
  };

  const showInReader = (entry: HTMLElement | null) => {
    if (!entry || entry === readerFor || !readerLink) return;
    readerFor = entry;
    readerLink.href = entry.getAttribute('href') ?? '#';
    const cover = entry.dataset.peekCover;
    if (readerImg) {
      readerImg.hidden = !cover;
      if (cover) readerImg.src = cover;
    }
    if (readerMeta) readerMeta.textContent = entry.dataset.peekMeta ?? '';
    if (readerTitle) readerTitle.textContent = entry.dataset.peekTitle ?? '';
    if (readerDesc) readerDesc.textContent = entry.dataset.peekDesc ?? '';
    if (!reduceMotion.matches) {
      readerLink.classList.remove('swap');
      void readerLink.offsetWidth; // restart the swap animation
      readerLink.classList.add('swap');
    }
  };

  // Scroll progress, current row and current year
  let frame = 0;
  const update = () => {
    frame = 0;
    const line = readingLine();
    // Passed: dot above the reading line. Current: the dot closest to it.
    let nearest: HTMLElement | null = rows[0] ?? null;
    let nearestDistance = Infinity;
    for (const row of rows) {
      const y = dotY(row);
      row.classList.toggle('passed', y <= line);
      const distance = Math.abs(y - line);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = row;
      }
    }
    // One focus at a time: the hovered post while the pointer is on the list, else the reading line.
    const hoveredRow = readerShown() ? (hovered?.closest<HTMLElement>('[data-archive-row]') ?? null) : null;
    setFocus(hoveredRow ?? nearest);

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
  let observer: IntersectionObserver | undefined;
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const fold = window.innerHeight;
    const pending = rows.filter((el) => el.getBoundingClientRect().top > fold);
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

  // Hover preview card beside the list (mouse and trackpad, from 1024px)
  const peek = document.querySelector<HTMLElement>('[data-archive-peek]');
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
  const img = peek?.querySelector<HTMLImageElement>('[data-peek-img]');
  const metaOut = peek?.querySelector<HTMLElement>('[data-peek-meta-out]');
  const titleOut = peek?.querySelector<HTMLElement>('[data-peek-title-out]');
  const descOut = peek?.querySelector<HTMLElement>('[data-peek-desc-out]');
  let shownFor: HTMLElement | null = null;

  const hidePeek = () => {
    shownFor = null;
    peek?.classList.remove('show');
  };
  /**
   * Keep the card off the reading path (titles and dates): over the right rail when it sits
   * beside the list, otherwise right-aligned over the tags column. Vertically centred on the row.
   */
  const placePeek = (entry: HTMLElement) => {
    if (!peek) return;
    const edge = 16;
    const row = entry.getBoundingClientRect();
    const rail = document.querySelector<HTMLElement>('#swup-shell .shell-right')?.getBoundingClientRect();
    const railBeside = !!rail && rail.width > 0 && rail.left >= row.right - 1;
    const width = railBeside && rail ? Math.min(340, rail.width - 2 * edge) : 340;
    peek.style.width = width + 'px';
    const left = railBeside && rail ? rail.left + edge : row.right - width;
    const header = document.getElementById('swup-header')?.getBoundingClientRect().bottom ?? 0;
    const height = peek.offsetHeight;
    const top = Math.max(header + edge, Math.min(row.top + row.height / 2 - height / 2, window.innerHeight - height - edge));
    peek.style.left = left + 'px';
    peek.style.top = top + 'px';
  };
  const onOver = (e: MouseEvent) => {
    const entry = (e.target as Element).closest<HTMLElement>('.entry');
    // Wide layout: the reader card shows the hovered post instead of a floating card.
    if (readerShown()) {
      if (entry && canHover.matches && entry !== hovered) {
        hovered = entry;
        setFocus(entry.closest<HTMLElement>('[data-archive-row]'));
      }
      return;
    }
    if (!peek || !canHover.matches) return;
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
    // Leaving the list hands the reader card back to the scroll position.
    if (hovered && (!to || !to.closest('.years'))) {
      hovered = null;
      onScroll();
    }
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
