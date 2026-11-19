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
  /** Where the connector leaves the card, measured from the card's top. */
  const LINK_Y = 28;
  /** Keep this far inside the card's top and bottom edges when aiming the connector. */
  const EDGE = 16;
  let shift = 0;
  /** Vertical direction of the pointer: 1 moving down, -1 moving up. */
  let pointerDir = 1;
  let pointerY: number | null = null;
  const onMove = (e: MouseEvent) => {
    if (pointerY !== null && Math.abs(e.clientY - pointerY) > 2) pointerDir = e.clientY > pointerY ? 1 : -1;
    pointerY = e.clientY;
    if (hovered) pointConnector();
  };
  /**
   * The card's resting top (sticky at the reading line, or its place in the flow before it
   * sticks), computed from layout so an in-flight slide animation cannot skew it.
   */
  const restTop = () => {
    if (!reader || !readerLink) return 0;
    const aside = reader.getBoundingClientRect();
    const marginTop = parseFloat(getComputedStyle(readerLink).marginTop) || 0;
    const sticky = readingLine() - LINK_Y;
    return Math.min(Math.max(sticky, aside.top + marginTop), aside.bottom - readerLink.offsetHeight);
  };
  /**
   * The card glides every frame towards its target, so moving between rows slides it smoothly:
   * - hovering: beside the pointer, placed ahead of it (moving down, the pointer sits near the
   *   card's top so the rows below stay beside it; moving up, near its bottom). The switch
   *   between the two is eased too, so changing direction never jumps.
   * - otherwise: back to the resting place at the reading line.
   * The connector aims at the shown post's dot on every frame.
   */
  let cardTop: number | null = null;
  let anchor = LINK_Y;
  let glide = 0;
  const EASE = 0.2;
  const tick = () => {
    glide = 0;
    if (!readerLink || !readerShown()) return;
    const height = readerLink.offsetHeight;
    const rest = restTop();
    let target = rest;
    let settling = false;
    if (hovered && pointerY !== null) {
      const header = document.getElementById('swup-header')?.getBoundingClientRect().bottom ?? 0;
      const anchorWanted = pointerDir > 0 ? LINK_Y : height - LINK_Y;
      anchor = reduceMotion.matches ? anchorWanted : anchor + (anchorWanted - anchor) * EASE;
      settling = Math.abs(anchorWanted - anchor) > 0.5;
      target = Math.max(header + EDGE, Math.min(pointerY - anchor, window.innerHeight - height - EDGE));
    } else {
      anchor = LINK_Y;
      // Already resting: follow the sticky place exactly (no lag while the page scrolls).
      if (cardTop === null || Math.abs(shift) < 0.5) cardTop = rest;
    }
    if (cardTop === null) cardTop = rest;
    cardTop = reduceMotion.matches ? target : cardTop + (target - cardTop) * EASE;
    if (Math.abs(target - cardTop) < 0.5) cardTop = target;
    else settling = true;
    shift = cardTop - rest;
    readerLink.style.translate = `0 ${shift.toFixed(1)}px`;

    const row = readerFor?.closest('[data-archive-row]');
    if (row) {
      const y = dotY(row) - cardTop;
      readerLink.style.setProperty('--link-y', `${Math.round(y)}px`);
      readerLink.style.setProperty('--link-on', y >= EDGE - 4 && y <= height - EDGE + 4 ? '1' : '0');
    }
    if (settling) glide = requestAnimationFrame(tick);
  };
  const pointConnector = () => {
    if (!glide) glide = requestAnimationFrame(tick);
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
    // Read every position first, then write, so a frame costs one layout instead of one per row.
    const rowYs = rows.map(dotY);
    const yearTops = years.map((y) => y.getBoundingClientRect().top);
    const wide = readerShown();

    // Passed: dot above the reading line. Current: the dot closest to it.
    let nearest: HTMLElement | null = rows[0] ?? null;
    let nearestDistance = Infinity;
    rows.forEach((row, i) => {
      const distance = Math.abs(rowYs[i] - line);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = row;
      }
    });
    let current = years[0]?.id;
    for (let i = 0; i < years.length; i++) {
      if (yearTops[i] - line <= 0) current = years[i].id;
      else break;
    }

    rows.forEach((row, i) => row.classList.toggle('passed', rowYs[i] <= line));
    // One focus at a time: the hovered post while the pointer is on the list, else the reading line.
    const hoveredRow = wide ? (hovered?.closest<HTMLElement>('[data-archive-row]') ?? null) : null;
    setFocus(hoveredRow ?? nearest);
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
  document.addEventListener('mousemove', onMove, { passive: true });
  tree.addEventListener('mouseout', onOut);

  cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', hidePeek);
    window.removeEventListener('resize', onScroll);
    document.removeEventListener('click', onClick, true);
    tree.removeEventListener('mouseover', onOver);
    document.removeEventListener('mousemove', onMove);
    tree.removeEventListener('mouseout', onOut);
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    if (glide) cancelAnimationFrame(glide);
    railLinks.forEach((a) => a.removeAttribute('aria-current'));
  };
}
