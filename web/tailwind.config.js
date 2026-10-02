/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: '#fcfbf7',
          100: '#f7f4ec',
          200: '#ede6d3',
          800: '#2c251e',
          900: '#1b1612',
          950: '#0f0c0a',
        },
        cultivator: {
          primary: '#e0a96d',
          accent: '#8b5cf6',
          glow: '#f59e0b',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
      }
    },
  },
  plugins: [],
}
