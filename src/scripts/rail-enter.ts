/**
 * Marks which side rails changed type across a swup page change so CSS can
 * slide them in (see styles/shell.css "Rail enter animation").
 */
type SwupHooks = {
  before: (hook: string, handler: () => void) => void;
  on: (hook: string, handler: () => void) => void;
};

export function initRailEnter(hooks: SwupHooks): void {
  let prev: { left?: string; right?: string } = {};

  hooks.before('content:replace', () => {
    const shell = document.getElementById('swup-shell');
    prev = { left: shell?.dataset.left, right: shell?.dataset.right };
  });

  hooks.on('content:replace', () => {
    const shell = document.getElementById('swup-shell');
    if (!shell) return;
    const enter: string[] = [];
    if (shell.dataset.left !== prev.left && shell.dataset.left !== 'none') enter.push('left');
    if (shell.dataset.right !== prev.right && shell.dataset.right !== 'none') enter.push('right');
    if (enter.length) shell.dataset.enter = enter.join(' ');
  });
}
