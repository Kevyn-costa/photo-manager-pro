/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#07090e',
          900: '#0f121c',
          800: '#181c2a',
          700: '#252b3d',
        },
        brand: {
          blue: '#2563eb',
          blueHover: '#1d4ed8',
          red: '#dc2626',
          redHover: '#b91c1c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}