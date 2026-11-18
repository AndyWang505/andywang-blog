/**
 * Inline SVG icon definitions (docs/redesign/01-foundations.md §7).
 * Stroke icons inherit currentColor; fill icons use currentColor as fill.
 */
export interface IconDef {
  viewBox: string;
  /** Present for stroke icons; omitted for fill icons. */
  strokeWidth?: number;
  body: string;
}

export const icons = {
  search: { viewBox: '0 0 24 24', strokeWidth: 2.2, body: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>' },
  moon: { viewBox: '0 0 24 24', strokeWidth: 2, body: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>' },
  sun: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    body: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  },
  menu: { viewBox: '0 0 24 24', strokeWidth: 2, body: '<path d="M4 9h16M4 15h16"/>' },
  close: { viewBox: '0 0 24 24', strokeWidth: 2, body: '<path d="M6 6l12 12M18 6L6 18"/>' },
  list: { viewBox: '0 0 24 24', strokeWidth: 2, body: '<path d="M4 6h16M4 12h10M4 18h13"/>' },
  'chevron-down': { viewBox: '0 0 24 24', strokeWidth: 2, body: '<path d="M6 9l6 6 6-6"/>' },
  'arrow-up': { viewBox: '0 0 24 24', strokeWidth: 2, body: '<path d="M12 19V5M5 12l7-7 7 7"/>' },
  link: {
    viewBox: '0 0 24 24',
    strokeWidth: 2,
    body: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  },
  rss: {
    viewBox: '0 0 24 24',
    strokeWidth: 2.2,
    body: '<path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>',
  },
  github: { viewBox: '0 0 16 16', body: '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>' },
  x: {
    viewBox: '0 0 24 24',
    body: '<path d="M18.9 2H22l-7.6 8.7L23 22h-6.8l-5.3-6.9L4.8 22H1.7l8.1-9.3L1 2h7l4.8 6.3L18.9 2zm-1.2 18h1.9L7.4 3.9H5.4L17.7 20z"/>',
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof icons;
