/**
 * Client entry. Page-level features re-initialise after every swup page view.
 * Spec: docs/redesign/02-layout.md §8
 */
import { initPhotoSwipe } from './photoswipe';
import { initProgress } from './progress';
import { initMobileMenu } from './mobile-menu';
import { initCategoryBar } from './category-bar';
import { initToc } from './toc';
import { initRailEnter } from './rail-enter';

type SwupLike = {
  hooks: { before: (hook: string, handler: () => void) => void; on: (hook: string, handler: () => void) => void };
};

function initPage(): void {
  initProgress();
  initMobileMenu();
  initCategoryBar();
  initToc();
}

initPage();
// PhotoSwipe registers its own swup hooks.
initPhotoSwipe();

const bindSwup = () => {
  const hooks = (window as unknown as { swup?: SwupLike }).swup?.hooks;
  if (!hooks) return;
  hooks.on('page:view', initPage);
  initRailEnter(hooks);
};
if ((window as unknown as { swup?: SwupLike }).swup?.hooks) bindSwup();
else document.addEventListener('swup:enable', bindSwup, { once: true });
