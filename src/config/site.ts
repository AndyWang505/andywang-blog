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

/** Tags treated as article series, in priority order (docs/redesign/05-data.md §2). */
export const SITE_SERIES: readonly string[] = ['X-Driven'];
