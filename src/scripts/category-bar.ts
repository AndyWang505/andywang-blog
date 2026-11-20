/** Keep the current category chip in view in the mobile category bar. */
export function initCategoryBar(): void {
  const bar = document.querySelector<HTMLElement>('[data-scroll-current]');
  const current = bar?.querySelector<HTMLElement>('[aria-current="page"]');
  if (!bar || !current || bar.offsetParent === null) return;
  bar.scrollLeft = current.offsetLeft - (bar.clientWidth - current.clientWidth) / 2;
}
