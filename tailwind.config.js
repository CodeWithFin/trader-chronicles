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
        family: ['var(--font-space-grotesk)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: '#fbfaf9',
        stone: '#f2f0ed',
        sand: '#f6f4ef',
        ink: '#121212',
        charcoal: '#343433',
        brown: '#474645',
        muted: '#7e7e7d',
        'stone-border': '#e5d5c3',
        link: '#0086fc',
        sky: '#64c6ff',
        altblue: '#00b2ff',
        grass: '#00c978',
        mint: '#00ca48',
        ember: '#ff3e00',
        sun: '#ffcd6c',
        gold: '#d48f00',
        honey: '#ffbb26',
        coral: '#ff58ae',
        plum: '#9f4fff',
        alert: '#ff2b3a',
      },
      borderRadius: {
        card: '10px',
        pill: '9999px',
        illo: '72px',
      },
      boxShadow: {
        card: 'inset 0 0 0 1px #f2f0ed',
        'card-hover': 'inset 0 0 0 1px #e5d5c3',
        dark: '0 0 24px 0 rgba(0,0,0,0.15)',
        lifted: '0 1px 6px 0 rgba(0,0,0,0.04), 0 0 24px 0 rgba(0,0,0,0.05)',
      },
    },
  },
  plugins: [],
}
