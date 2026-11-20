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
 * Archive overview: posts grouped into themes for the yearly chart. Each theme matches one of
 * the five post categories, so every post lands in exactly the theme named after its category
 * (posts outside these categories would be counted under 其他; the tags test forbids them).
 * Order is also the chart's colour slot order (keep it; it is part of the colour-blind safety).
 */
export const ARCHIVE_THEMES: readonly { name: string; tags?: readonly string[]; categories?: readonly string[] }[] = [
  { name: '演算法', categories: ['演算法'] },
  { name: '程式開發', categories: ['程式開發'] },
  { name: '軟體設計', categories: ['軟體設計'] },
  { name: '開發工具', categories: ['開發工具'] },
  { name: '職涯成長', categories: ['職涯成長'] },
];

/** Tags treated as article series, in priority order. */
export const SITE_SERIES: readonly string[] = ['Methodology', 'Design-Pattern'];

/** Every tag a post may use. Add a tag here before using it in a post; a test enforces this. */
export const ALLOWED_TAGS = {
  tech: [
    'JavaScript', 'TypeScript', 'React', 'Redux', 'SWR', 'jQuery', 'Vitest',
    'CSS', 'HTML', 'Tailwind', 'Astro', 'Jekyll',
    'Git', 'Docker', 'Kubernetes', 'Homebrew', 'ESLint', 'macOS',
    'Cursor', 'Claude', 'Neovim', 'Tmux', 'VSCode',
    'LeetCode',
  ],
  topic: [
    'Performance', 'Testing', 'Fundamentals', 'DOM', 'Async', 'Event-Loop',
    'Generics', 'Enums', 'Type-System', 'Hooks', 'Error-Handling', 'State-Management', 'Data-Fetching',
    'Design-System', 'Blog',
    'Methodology', 'TDD', 'BDD', 'DDD', 'Architecture', 'Clean-Architecture', 'SOLID', 'OOP',
    'API-Design', 'Clean-Code', 'Refactoring', 'Design-Pattern',
    'Deployment', 'Troubleshooting', 'Dev-Environment', 'Migration', 'AI', 'Multi-Agent',
    'Retro', 'Interview', 'Soft-Skills', 'Communication', 'Talk-Notes',
    'DP', 'Recursion', 'Complexity', 'Data-Structure', 'Math',
  ],
} as const;
