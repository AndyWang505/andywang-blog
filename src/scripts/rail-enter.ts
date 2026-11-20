/**
 * Marks which side rails should slide in after a swup page change so CSS can
 * animate them (see styles/shell.css "Rail enter animation"):
 * A rail slides in when it is shown now and either was hidden on the previous
 * page or changed type (left: list rail <-> compact article rail; right: list
 * rail <-> chapter TOC). A rail of the same type on both pages stays put.
 */
type SwupHooks = {
  before: (hook: string, handler: () => void) => void;
  on: (hook: string, handler: () => void) => void;
};

type RailState = { leftVisible: boolean; rightVisible: boolean; left?: string; right?: string };

const isVisible = (el: Element | null | undefined): boolean => !!el && el.getBoundingClientRect().width > 0;

function readState(): RailState {
  const shell = document.getElementById('swup-shell');
  return {
    leftVisible: isVisible(shell?.querySelector('.shell-left')),
    rightVisible: isVisible(shell?.querySelector('.shell-right')),
    left: shell?.dataset.left,
    right: shell?.dataset.right,
  };
}

export function initRailEnter(hooks: SwupHooks): void {
  let prev: RailState = { leftVisible: false, rightVisible: false };

  hooks.before('content:replace', () => {
    prev = readState();
  });

  hooks.on('content:replace', () => {
    const shell = document.getElementById('swup-shell');
    if (!shell) return;
    const next = readState();
    const enter: string[] = [];
    if (next.leftVisible && (next.left !== prev.left || !prev.leftVisible)) enter.push('left');
    if (next.rightVisible && (next.right !== prev.right || !prev.rightVisible)) enter.push('right');
    if (enter.length) shell.dataset.enter = enter.join(' ');
  });
}
