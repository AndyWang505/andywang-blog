/**
 * Archive page behaviour (components/post-list/ArchiveTimeline.astro):
 * - posts above the reading line marked as passed (accent dot and spine), current year in the rail
 * - smooth jumps for rail years and heatmap cells (handled here, not as swup visits)
 * - rows below the fold fade in as they scroll into view
 * - wide layout: a reader card driven by a small state machine (see "Reader card" below)
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
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 1024px)');
  const years = [...tree.querySelectorAll<HTMLElement>('h2[id^="y"]')];
  const rows = [...tree.querySelectorAll<HTMLElement>('[data-archive-row]')];
  const railLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/archive/#y"]')];

  const dotY = (row: Element) => {
    const r = (row.querySelector('.dot') ?? row).getBoundingClientRect();
    return r.top + r.height / 2;
  };

  /*
   * Reader card (wide layout)
   *
   * Three modes, and one rule for each:
   *   reading  – pointer not on the list. Focus: the post nearest the reading line.
   *              Card: rests at the reading line.
   *   pointing – pointer on the list. Focus: the post nearest the pointer's height.
   *              Card: level with that post's dot, so the connector is a straight line.
   *   holding  – pointer on the card. Focus and card stay put, so the card can be clicked.
   *
   * Input handlers only record where the pointer is; every frame derives the mode's focus and
   * the card position from that and the current scroll. Moving within one post leaves the card
   * still; reaching the next post moves it one row with a CSS transition (the browser retargets
   * smoothly if the pointer keeps going). While the page scrolls under a still pointer the card
   * stays beside the pointer and only its content and connector change; it settles level with
   * the dot once scrolling stops. Moves longer than about half a card fade across instead.
   * Leaving the list returns to reading after a short grace period; coming back cancels it.
   */
  type Mode = 'reading' | 'pointing' | 'holding';
  type Region = 'list' | 'card' | 'outside';

  const reader = tree.querySelector<HTMLElement>('[data-archive-reader]');
  const readerLink = reader?.querySelector<HTMLAnchorElement>('[data-reader-link]');
  const readerImg = reader?.querySelector<HTMLImageElement>('[data-reader-img]');
  const readerMeta = reader?.querySelector<HTMLElement>('[data-reader-meta]');
  const readerTitle = reader?.querySelector<HTMLElement>('[data-reader-title]');
  const readerDesc = reader?.querySelector<HTMLElement>('[data-reader-desc]');
  const readerShown = () => !!reader && getComputedStyle(reader).display !== 'none';

  /** Where the connector leaves the card when resting, measured from the card's top. */
  const LINK_Y = 28;
  /**
   * While pointing, the focused dot sits this far below the card's top: posts half a row above
   * or below the pointer then stay beside the card, so the connector keeps reaching them while
   * the page scrolls under a still pointer.
   */
  const POINT_Y = 80;
  /** Keep this far inside the card's edges (and the viewport's) when placing and aiming. */
  const EDGE = 16;
  /** Grace period before leaving the list hands the card back to the reading line. */
  const RELEASE_DELAY = 450;
  /** Farther than this (about half a card) the card fades across instead of travelling. */
  const HOP = 150;
  const HOP_MS = 140;
  /** Keep in sync with the card's translate transition in ArchiveTimeline.astro. */
  const MOVE_MS = 320;

  let mode: Mode = 'reading';
  let pointer: { x: number; y: number } | null = null;
  let releaseTimer = 0;
  let currentRow: HTMLElement | null = null;
  let shownEntry: HTMLElement | null = null;

  const regionAt = (x: number, y: number): Region => {
    const el = document.elementFromPoint(x, y);
    if (!el) return 'outside';
    if (reader?.contains(el)) return 'card';
    return el.closest('.years') ? 'list' : 'outside';
  };
  const enterRegion = (region: Region) => {
    if (region === 'outside') {
      if (mode !== 'reading' && !releaseTimer) {
        releaseTimer = window.setTimeout(() => {
          releaseTimer = 0;
          mode = 'reading';
          schedule();
        }, RELEASE_DELAY);
      }
      return;
    }
    window.clearTimeout(releaseTimer);
    releaseTimer = 0;
    mode = region === 'card' ? 'holding' : 'pointing';
  };

  const showInReader = (entry: HTMLElement | null) => {
    if (!entry || entry === shownEntry || !readerLink) return;
    shownEntry = entry;
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

  // Card motion: CSS transition between posts, instant while scrolling, fade for long moves.
  let applied: number | null = null; // translate currently applied, px from the resting place
  let scrollingUntil = 0;
  let hopping = false;
  let hopTimer = 0;

  /** The card's resting top: sticky at the reading line, or its place in the flow before it sticks. */
  const restTop = (column: DOMRect, marginTop: number, height: number) =>
    Math.min(Math.max(readingLine() - LINK_Y, column.top + marginTop), column.bottom - height);

  const setShift = (px: number, animate: boolean) => {
    if (!readerLink) return;
    readerLink.classList.toggle('instant', !animate);
    readerLink.style.translate = `0 ${px}px`;
    applied = px;
  };

  /** Aim the connector at the focused dot from the card's actual position (also mid-transition). */
  const aim = () => {
    if (!readerLink) return;
    const row = shownEntry?.closest('[data-archive-row]');
    if (!row) return;
    const card = readerLink.getBoundingClientRect();
    const y = dotY(row) - card.top;
    readerLink.style.setProperty('--link-y', `${Math.round(y)}px`);
    readerLink.style.setProperty('--link-on', y >= EDGE - 4 && y <= card.height - EDGE + 4 ? '1' : '0');
  };
  /** Keep re-aiming while a CSS move is running, so the connector never lags the card. */
  let aimFrame = 0;
  let aimUntil = 0;
  const aimDuringMove = () => {
    aimUntil = performance.now() + MOVE_MS + 40;
    const loop = () => {
      aim();
      aimFrame = performance.now() < aimUntil ? requestAnimationFrame(loop) : 0;
    };
    if (!aimFrame) aimFrame = requestAnimationFrame(loop);
  };

  /** Card top in viewport px after the last placement. */
  let lastTop: number | null = null;

  const place = () => {
    if (!reader || !readerLink || !readerShown() || hopping) return;
    const height = readerLink.offsetHeight;
    const column = reader.getBoundingClientRect();
    const marginTop = parseFloat(getComputedStyle(readerLink).marginTop) || 0;
    const rest = restTop(column, marginTop, height);
    const focusRow = shownEntry?.closest('[data-archive-row]') ?? null;
    const scrolling = performance.now() < scrollingUntil;

    let top = rest;
    if (mode === 'holding' && lastTop !== null) {
      top = lastTop; // stay put under the pointer
    } else if (mode === 'pointing' && scrolling && lastTop !== null) {
      top = lastTop; // pointer still, page moving: the card stays beside the pointer
    } else if (mode === 'pointing' && focusRow) {
      top = dotY(focusRow) - POINT_Y; // the focused dot level with the connector
    }
    // Inside both the viewport and the card's column: never over the calendar or the footer.
    if (mode !== 'reading') {
      const header = document.getElementById('swup-header')?.getBoundingClientRect().bottom ?? 0;
      const minTop = Math.max(header + EDGE, column.top + marginTop);
      const maxTop = Math.min(window.innerHeight - EDGE, column.bottom) - height;
      top = maxTop >= minTop ? Math.max(minTop, Math.min(top, maxTop)) : rest;
    }
    const next = Math.round(top - rest);

    if (applied === null || reduceMotion.matches || scrolling) {
      setShift(next, false);
    } else if (Math.abs(next - applied) > HOP) {
      // Long move: fade out, jump, fade in.
      hopping = true;
      readerLink.classList.add('hop');
      hopTimer = window.setTimeout(() => {
        hopping = false;
        applied = null; // land instantly on wherever the target is by now
        readerLink.classList.remove('hop', 'land');
        void readerLink.offsetWidth; // restart the fade-in
        readerLink.classList.add('land');
        schedule();
      }, HOP_MS);
      return;
    } else if (next !== applied) {
      setShift(next, true);
      aimDuringMove();
    }
    lastTop = rest + next;
    aim();
  };

  // One frame of state: progress, mode, focus. Reads first, then writes.
  let frame = 0;
  const update = () => {
    frame = 0;
    const line = readingLine();
    const rowYs = rows.map(dotY);
    const yearTops = years.map((y) => y.getBoundingClientRect().top);
    const wide = readerShown();
    if (wide && pointer && canHover.matches) enterRegion(regionAt(pointer.x, pointer.y));
    else if (mode !== 'reading') enterRegion('outside');

    const nearestTo = (y: number) => {
      let best: HTMLElement | null = rows[0] ?? null;
      let bestDistance = Infinity;
      rows.forEach((row, i) => {
        const d = Math.abs(rowYs[i] - y);
        if (d < bestDistance) {
          bestDistance = d;
          best = row;
        }
      });
      return best;
    };
    const focus =
      mode === 'holding' ? currentRow : mode === 'pointing' && pointer ? nearestTo(pointer.y) : nearestTo(line);
    let currentYear = years[0]?.id;
    for (let i = 0; i < years.length; i++) {
      if (yearTops[i] - line <= 0) currentYear = years[i].id;
      else break;
    }

    // Progress always follows the reading line, whatever the pointer does.
    rows.forEach((row, i) => row.classList.toggle('passed', rowYs[i] <= line));
    if (focus !== currentRow) {
      currentRow?.classList.remove('current');
      focus?.classList.add('current');
      currentRow = focus;
    }
    if (wide) showInReader(currentRow?.querySelector<HTMLElement>('.entry') ?? null);
    for (const a of railLinks) {
      if (a.hash === `#${currentYear}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    place();
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };

  const onPointerMove = (e: MouseEvent) => {
    pointer = { x: e.clientX, y: e.clientY };
    schedule();
  };
  const onPointerLeaveWindow = () => {
    pointer = null;
    schedule();
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

  // Narrower layouts: floating preview card beside the list (mouse and trackpad, from 1024px)
  const peek = document.querySelector<HTMLElement>('[data-archive-peek]');
  const img = peek?.querySelector<HTMLImageElement>('[data-peek-img]');
  const metaOut = peek?.querySelector<HTMLElement>('[data-peek-meta-out]');
  const titleOut = peek?.querySelector<HTMLElement>('[data-peek-title-out]');
  const descOut = peek?.querySelector<HTMLElement>('[data-peek-desc-out]');
  let peekFor: HTMLElement | null = null;

  const hidePeek = () => {
    peekFor = null;
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
    if (readerShown() || !peek || !canHover.matches) return;
    const entry = (e.target as Element).closest<HTMLElement>('.entry');
    if (!entry || entry === peekFor) return;
    peekFor = entry;
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
    if (peekFor && (!to || !peekFor.contains(to))) hidePeek();
  };

  /** When scrolling stops, settle the card level with the focused dot (a short CSS move). */
  let scrollEndTimer = 0;
  const onScroll = () => {
    scrollingUntil = performance.now() + 120;
    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(schedule, 140);
    schedule();
  };

  update();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', hidePeek, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('mousemove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('mouseleave', onPointerLeaveWindow);
  tree.addEventListener('mouseover', onOver);
  tree.addEventListener('mouseout', onOut);

  cleanup = () => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', hidePeek);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('mousemove', onPointerMove);
    document.documentElement.removeEventListener('mouseleave', onPointerLeaveWindow);
    tree.removeEventListener('mouseover', onOver);
    tree.removeEventListener('mouseout', onOut);
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
    window.clearTimeout(releaseTimer);
    window.clearTimeout(hopTimer);
    window.clearTimeout(scrollEndTimer);
    if (aimFrame) cancelAnimationFrame(aimFrame);
    railLinks.forEach((a) => a.removeAttribute('aria-current'));
  };
}
