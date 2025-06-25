/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // ← ✅ Ajoute cette ligne pour activer le mode sombre via .dark
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require('tailwind-scrollbar-hide')],
}