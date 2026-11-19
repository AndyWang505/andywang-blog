/** Shared navigation and shell contract types. Spec: docs/redesign/02-layout.md */

export type NavKey = 'home' | 'posts' | 'category' | 'tags' | 'about';

/** Left rail visibility: from 1024px, from 1440px, or never. */
export type RailLeft = 'lg' | 'wide' | 'none';
/** Right column: home/list rail, article chapter TOC, or none. */
export type RailRight = 'rail' | 'toc' | 'none';

export const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: 'home', label: '首頁', href: '/' },
  { key: 'posts', label: '文章', href: '/archive/' },
  { key: 'category', label: '分類', href: '/archive/category/' },
  { key: 'tags', label: '標籤', href: '/archive/tag/' },
  { key: 'about', label: '關於', href: '/about/' },
];
