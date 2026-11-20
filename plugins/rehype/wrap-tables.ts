/**
 * Wrap every <table> in <div class="table-wrap"> so wide tables scroll inside
 * their own box instead of the page.
 */
interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function wrap(node: HastNode): void {
  if (!node.children) return;
  node.children = node.children.map((child) => {
    if (child.type === 'element' && child.tagName === 'table') {
      return { type: 'element', tagName: 'div', properties: { className: ['table-wrap'] }, children: [child] };
    }
    wrap(child);
    return child;
  });
}

export default function rehypeWrapTables() {
  return (tree: HastNode) => wrap(tree);
}
