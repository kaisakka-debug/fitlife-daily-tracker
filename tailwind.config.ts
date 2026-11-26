import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sarabun)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-prompt)', 'var(--font-sarabun)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
