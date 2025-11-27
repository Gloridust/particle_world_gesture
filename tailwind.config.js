/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sci-fi-blue': '#00f3ff',
        'sci-fi-bg': '#050510',
      }
    },
  },
  plugins: [],
}

