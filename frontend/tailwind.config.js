/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          500: '#4f6ef7',
          600: '#3b55e8',
          700: '#2d43c9',
        }
      }
    }
  },
  plugins: [],
}
