/**
 * Maps semantic and component tokens (CSS variables) into Tailwind's theme.
 * Tailwind only ever references `var(--...)`; values live in ./semantic.css and ./components.css.
 * A test (src/lib/__tests__/tokens.test.ts) checks every variable named here exists in the CSS.
 * Spec: docs/redesign/01-foundations.md §4
 */

const v = (name, fallback) => (fallback ? `var(--${name}, ${fallback})` : `var(--${name})`);

export const tokenTheme = {
  screens: {
    wide: '1440px',
    ultra: '1920px',
  },
  colors: {
    bg: { DEFAULT: v('color-bg-default'), subtle: v('color-bg-subtle'), muted: v('color-bg-muted') },
    fg: { DEFAULT: v('color-fg-default'), body: v('color-fg-body'), muted: v('color-fg-muted'), subtle: v('color-fg-subtle') },
    line: { DEFAULT: v('color-border-default'), muted: v('color-border-muted') },
    accent: v('color-accent'),
    glass: v('color-surface-glass'),
    code: { bg: v('color-code-bg'), header: v('color-code-header') },
  },
  fontFamily: {
    // Fallbacks keep pages that do not load the tokens (e.g. the current 404) on a sans-serif font.
    sans: v('font-sans', 'ui-sans-serif, system-ui, sans-serif'),
    mono: v('font-mono', 'ui-monospace, monospace'),
  },
  fontSize: {
    xs: v('text-xs'),
    sm: v('text-sm'),
    base: v('text-base'),
    lg: v('text-lg'),
    xl: v('text-xl'),
    '2xl': v('text-2xl'),
    '3xl': v('text-3xl'),
    display: v('text-display'),
    prose: v('text-prose'),
    ui: v('text-ui'),
    'ui-sm': v('text-ui-sm'),
  },
  lineHeight: {
    tight: v('leading-tight'),
    snug: v('leading-snug'),
    normal: v('leading-normal'),
    relaxed: v('leading-relaxed'),
    loose: v('leading-loose'),
  },
  letterSpacing: {
    tight: v('tracking-tight'),
    snug: v('tracking-snug'),
  },
  borderRadius: {
    sm: v('radius-sm'),
    md: v('radius-md'),
    lg: v('radius-lg'),
    full: v('radius-full'),
  },
  zIndex: {
    sticky: v('z-sticky'),
    overlay: v('z-overlay'),
    header: v('z-header'),
    skip: v('z-skip-link'),
  },
  transitionDuration: {
    fast: v('duration-fast'),
    base: v('duration-base'),
  },
  transitionTimingFunction: {
    standard: v('ease-standard'),
  },
  width: {
    'rail-left': v('rail-left-width'),
    'rail-right': v('rail-right-width'),
    toc: v('toc-width'),
  },
  maxWidth: {
    measure: v('content-measure'),
    wide: v('content-wide'),
  },
  height: {
    header: v('header-height'),
    chip: v('chip-height'),
    tag: v('tag-height'),
  },
  minHeight: {
    touch: v('touch-target'),
    chip: v('chip-height'),
    tag: v('tag-height'),
  },
};

/** Every CSS variable referenced above, for the token consistency test. */
export function referencedVariables(theme = tokenTheme) {
  const names = new Set();
  const walk = (value) => {
    if (typeof value === 'string') {
      for (const m of value.matchAll(/var\(--([\w-]+)/g)) names.add(m[1]);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk);
    }
  };
  walk(theme);
  return [...names].sort();
}
