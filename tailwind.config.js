/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        line: 'var(--border)',
      },
      boxShadow: {
        brutal: '2px 2px 0 0 var(--shadow)',
        'brutal-sm': '2px 2px 0 0 var(--shadow)',
        'brutal-md': '4px 4px 0 0 var(--shadow)',
        'brutal-lg': '6px 6px 0 0 var(--shadow)',
        'brutal-xl': '8px 8px 0 0 var(--shadow)',
        'brutal-2xl': '12px 12px 0 0 var(--shadow)',
        'brutal-drawer': '-8px 0 0 0 var(--shadow)',
      },
    },
  },
  plugins: [],
}
