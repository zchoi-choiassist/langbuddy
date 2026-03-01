import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)'],
        'korean-serif': ['var(--font-korean-serif)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-surface': 'var(--bg-surface)',
        'bg-subtle': 'var(--bg-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'accent-celadon': 'var(--accent-celadon)',
        'accent-celadon-light': 'var(--accent-celadon-light)',
        'accent-vermillion': 'var(--accent-vermillion)',
        'accent-vermillion-light': 'var(--accent-vermillion-light)',
        'accent-indigo': 'var(--accent-indigo)',
        'border-light': 'var(--border-light)',
        'border-subtle': 'var(--border-subtle)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        modal: 'var(--radius-modal)',
        button: 'var(--radius-button)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        modal: 'var(--shadow-modal)',
      },
      keyframes: {
        cardIn: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        popIn: {
          from: { opacity: '0', transform: 'scale(0.5)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        cardIn: 'cardIn 0.5s var(--ease-out) backwards',
        fadeUp: 'fadeUp 0.4s var(--ease-out) backwards',
        slideUp: 'slideUp 0.4s var(--ease-out)',
        fadeIn: 'fadeIn 0.2s ease',
        popIn: 'popIn 0.5s var(--ease-spring) backwards',
      },
    },
  },
  plugins: [],
}
export default config
