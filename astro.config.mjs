import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from "@astrojs/react";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax"
import tailwind from "@astrojs/tailwind";
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkToc from 'remark-toc';
import remarkGfm from 'remark-gfm';
import swup from '@swup/astro';

import ExpressiveCode from 'astro-expressive-code';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginLanguageBadge } from './plugins/expressive-code/language-badge';
import rehypeWrapTables from './plugins/rehype/wrap-tables';

// https://astro.build/config
export default defineConfig({
  site: 'https://andywangtw.dev',
  integrations: [swup({
    theme: false,
    animationClass: "transition-swup-",
    containers: ["#swup-header", "#swup-shell"],
    smoothScrolling: false,
    cache: true,
    preload: true,
    accessibility: true,
    updateHead: true,
    updateBodyClass: false,
    globalInstance: true,
  }), ExpressiveCode(
    {
      // v2: light uses github-light, dark uses tokyo-night
      themes: ['github-light', 'tokyo-night'],
      useDarkModeMediaQuery: false,
      // EC prefixes this with :root, so use class-only selectors (.dark is set on <html>)
      themeCssSelector: (theme) => (theme.type === 'dark' ? '.dark' : false),
      plugins: [
        pluginCollapsibleSections(),
        pluginLineNumbers(),
        pluginLanguageBadge(),
      ],
      defaultProps: {
        wrap: false,
        overridesByLang: {
          'shellsession': {
            showLineNumbers: false,
          },
        },
      },
      styleOverrides: {
        borderRadius: '12px',
        borderColor: 'transparent',
        codeBackground: 'var(--color-code-bg)',
        codeFontFamily: 'var(--font-mono)',
        codeFontSize: '0.84em',
        codeLineHeight: '1.75',
        frames: {
          editorBackground: 'var(--color-code-bg)',
          terminalBackground: 'var(--color-code-bg)',
          editorTabBarBackground: 'var(--color-code-header)',
          terminalTitlebarBackground: 'var(--color-code-header)',
          editorActiveTabBackground: 'transparent',
          editorActiveTabIndicatorTopColor: 'transparent',
          editorActiveTabIndicatorBottomColor: 'var(--color-accent)',
          editorTabBarBorderBottomColor: 'transparent',
          terminalTitlebarBorderBottomColor: 'transparent',
        },
        textMarkers: {
          delHue: 0,
          insHue: 180,
          markHue: 250
        }
      },
      frames: {
        showCopyToClipboardButton: true,
      }
    }
  ), sitemap({
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date(),
    entryLimit: 10000,
    customPages: [
      'https://andywangtw.dev/about',
      'https://andywangtw.dev/archive',
      'https://andywangtw.dev/archive/category',
      'https://andywangtw.dev/archive/tag',
      'https://andywangtw.dev/link',
    ],
    i18n: {
      defaultLocale: 'zh-TW',
      locales: {
        'zh-TW': 'zh-TW'
      }
    }
  }), react(), tailwind()],
  markdown: {
    syntaxHighlight: false,
    remarkPlugins: [
      remarkMath,
      remarkGfm,
      [remarkToc, { heading: 'Table of Contents', maxDepth: 3 }],
    ],
    rehypePlugins: [
      rehypeWrapTables,
      rehypeSlug,
      [rehypeAutolinkHeadings, {
        behavior: 'append',
        properties: {
          class: 'heading-link',
        },
      }],
      rehypeMathjax,
    ],
  },
  base: '',
});