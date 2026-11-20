// Site configuration constants
export const SITE_CONFIG = {
  title: 'AndyWang′s Blog',
  description: '這裡是 AndyWang 的部落格，主要記錄著我的開發經驗以及技術筆記相關文章，偶爾也會分享或討論一些技術議題。',
  author: 'AndyWang',
  url: 'https://andywangtw.dev',
} as const;

// Default images
export const IMAGES = {
  defaultBlog: 'https://avatars.githubusercontent.com/u/71600455?v=4',
  defaultAvatar: 'https://avatars.githubusercontent.com/u/71600455?v=4',
  footerBgLight: '/back-footer/cave.foothold1.1.0.png',
  footerBgDark: '/back-footer/enH1.1.png',
} as const;

// Legacy exports for backward compatibility
export const SITE_TITLE = SITE_CONFIG.title;
export const SITE_DESCRIPTION = SITE_CONFIG.description;
export const DEFAULT_BLOG_IMAGE = IMAGES.defaultBlog;
export const DEFAULT_AVATAR = IMAGES.defaultAvatar;
export const FOOTER_BG_LIGHT = IMAGES.footerBgLight;
export const FOOTER_BG_DARK = IMAGES.footerBgDark;

// v2 author block
export const AUTHOR = {
  name: 'Andy Wang',
  role: 'Web Developer · Hsinchu',
  bio: 'INTJ 自由軟體愛好者 & 美食獵人',
  avatar: IMAGES.defaultAvatar,
  links: {
    github: 'https://github.com/AndyWang505',
    x: 'https://x.com/andywang890505',
    email: 'mailto:andywang890505@gmail.com',
    kofi: 'https://ko-fi.com/andywang890505',
    rss: '/rss.xml',
  },
} as const;

/**
 * Archive overview: posts grouped into themes for the yearly chart, ordered from software
 * engineering to life. A post takes the first theme whose `tags` it has (tags are checked
 * before categories, so a 心得 post tagged Life lands in 生活), otherwise the first theme
 * listing its category; anything left over is counted under 其他.
 * Order is also the chart's colour slot order (keep it; it is part of the colour-blind safety).
 */
export const ARCHIVE_THEMES: readonly { name: string; tags?: readonly string[]; categories?: readonly string[] }[] = [
  { name: '演算法', tags: ['Algorithm', 'Data-Structure', 'DP', 'Recursion', 'Complexity'], categories: ['LeetCode'] },
  { name: '開發', categories: ['JavaScript', 'TypeScript', 'React', 'Performance', 'Blog'] },
  {
    name: '架構',
    tags: ['Clean Code', 'Clean-Architecture', 'SOLID', 'OOP', 'DDD', 'TDD', 'BDD'],
    categories: ['Development', 'SystemDesign'],
  },
  { name: '工具', tags: ['Linter', 'ESLint', 'Git', 'Docker'], categories: ['DevOps', 'Git', 'Tools'] },
  { name: '職涯', tags: ['Junior', 'AI', 'MECE', 'Elevator-Pitch'] },
  { name: '生活', tags: ['Life', 'Retro'] },
];

/** Tags treated as article series, in priority order. */
export const SITE_SERIES: readonly string[] = ['X-Driven'];
