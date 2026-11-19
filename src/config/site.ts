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

// v2 author block (docs/redesign/03-components.md B2)
export const AUTHOR = {
  name: 'Andy Wang',
  role: 'Web Developer · Hsinchu',
  bio: '記錄開發經驗與技術筆記，偶爾分享技術議題。',
  avatar: IMAGES.defaultAvatar,
  links: {
    github: 'https://github.com/AndyWang505',
    x: 'https://x.com/andywang890505',
    rss: '/rss.xml',
  },
} as const;

/** GitHub account shown in the "GitHub 最近更新" rail section. */
export const GITHUB_USER = 'AndyWang505';

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

/** Tags treated as article series, in priority order (docs/redesign/05-data.md §2). */
export const SITE_SERIES: readonly string[] = ['X-Driven'];
