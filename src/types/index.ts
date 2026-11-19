// Type definitions

export interface BlogPost {
  frontmatter: {
    title: string;
    date: string;
    draft?: boolean;
    tags?: string[];
    category?: string;
    description?: string;
    heroImage?: string;
  };
  slug: string;
}

export interface BannerConfig {
  src: string;
  credit: {
    enable: boolean;
    text: string;
    url: string;
  };
}

export interface SiteConfig {
  title: string;
  description: string;
  author: string;
  url: string;
}