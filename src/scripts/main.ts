/**
 * Client entry. Page-level features re-initialise after every swup page view.
 * Spec: docs/redesign/02-layout.md §8
 */
import { initPhotoSwipe } from './photoswipe';
import { initProgress } from './progress';
import { initMobileMenu } from './mobile-menu';
import { initCategoryBar } from './category-bar';

type SwupLike = { hooks: { on: (hook: string, handler: () => void) => void } };

function initPage(): void {
  initProgress();
  initMobileMenu();
  initCategoryBar();
}

initPage();
// PhotoSwipe registers its own swup hooks.
initPhotoSwipe();

const bindSwup = () => (window as unknown as { swup?: SwupLike }).swup?.hooks.on('page:view', initPage);
if ((window as unknown as { swup?: SwupLike }).swup?.hooks) bindSwup();
else document.addEventListener('swup:enable', bindSwup, { once: true });
