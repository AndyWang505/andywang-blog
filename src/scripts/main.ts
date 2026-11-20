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
import { initTagFilter } from './tag-filter';
import { initArchive } from './archive';
import { initRandomPosts } from './random-posts';

type SwupLike = {
  hooks: { before: (hook: string, handler: () => void) => void; on: (hook: string, handler: () => void) => void };
};

function initPage(): void {
  initProgress();
  initMobileMenu();
  initCategoryBar();
  initToc();
  initTagFilter();
  initArchive();
}

initPage();
initRandomPosts();
// PhotoSwipe registers its own swup hooks.
initPhotoSwipe();

const bindSwup = () => {
  const hooks = (window as unknown as { swup?: SwupLike }).swup?.hooks;
  if (!hooks) return;
  hooks.on('page:view', initPage);
  hooks.on('page:view', () => initRandomPosts(true));
  initRailEnter(hooks);
};
if ((window as unknown as { swup?: SwupLike }).swup?.hooks) bindSwup();
else document.addEventListener('swup:enable', bindSwup, { once: true });
