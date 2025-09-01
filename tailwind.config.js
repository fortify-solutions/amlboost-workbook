/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'fortify-purple': '#79189C',
        'fortify-teal': '#00A99D',
        'fortify-blue': '#84B1EC',
        'fortify-lavender': '#8571F4',
      },
      fontFamily: {
        'dm-serif': ['DM Serif Display', 'serif'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}