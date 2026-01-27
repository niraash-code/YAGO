/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
        },
        brand: {
          500: '#8b5cf6', // Violet
          600: '#7c3aed',
        },
        accent: {
          hsr: '#a855f7', // Purple
          genshin: '#2dd4bf', // Teal
          zzz: '#ef4444', // Red
          wuwa: '#3b82f6', // Blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate")
  ],
}
