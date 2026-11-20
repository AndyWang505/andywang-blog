import containerQueries from '@tailwindcss/container-queries';
import { tokenTheme } from './src/styles/tokens/tailwind-theme.mjs';

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: "class",
	theme: {
		container: {
			center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
		extend: {
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
      // v2 design tokens
      ...tokenTheme,
    },
	},
	plugins: [
    require('tailwindcss-filters'),
    containerQueries,
  ],
}
