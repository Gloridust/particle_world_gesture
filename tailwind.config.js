/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tech-blue': '#00f3ff',
        'tech-dark': '#0a0a0a',
        'tech-panel': 'rgba(10, 10, 10, 0.8)',
      },
      fontFamily: {
        'tech': ['Orbitron', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

