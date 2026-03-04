/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a08',
        bg2: '#111110',
        bg3: '#1a1a18',
        amber: '#f5a623',
        ember: '#ff5c1a',
        green: '#2affa0',
        text: '#f0ede6',
        muted: '#7a7870',
        border: '#2a2a26',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'cursive'],
        body: ['"Syne"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
