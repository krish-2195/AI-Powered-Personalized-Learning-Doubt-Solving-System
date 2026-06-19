/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f4f0ff',
          100: '#e9ddff',
          200: '#cfb9ff',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
        },
        accent: {
          50: '#e6fffb',
          100: '#c7f7ef',
          200: '#9feadf',
          500: '#14b8a6',
          600: '#0f9e90',
          700: '#0c7f74',
        },
        glow: {
          50: '#fff4eb',
          100: '#ffe1c7',
          200: '#ffc590',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
      },

      animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(6px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}