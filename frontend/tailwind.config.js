/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f4f0ff',
          100: '#e9ddff',
          200: '#cfb9ff',
          300: '#b49bff',
          400: '#9b7dff',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
        },
        accent: {
          50: '#e6fffb',
          100: '#c7f7ef',
          200: '#9feadf',
          300: '#7cdbd0',
          400: '#4bc7bc',
          500: '#14b8a6',
          600: '#0f9e90',
          700: '#0c7f74',
        },
        glow: {
          50: '#fff4eb',
          100: '#ffe1c7',
          200: '#ffc590',
          300: '#ffb066',
          400: '#ff9233',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
        },
        // Refined surface scale for solid dark panels (replaces ad-hoc #12141c etc.)
        surface: {
          950: '#0a0b14',
          900: '#0f1019',
          850: '#12141f',
          800: '#171926',
          700: '#1d1f2e',
          600: '#252838',
        },
        ink: {
          border: 'rgba(148,163,184,0.12)',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,58,237,0.35), 0 18px 60px -20px rgba(124,58,237,0.65)',
        'glow-accent': '0 0 0 1px rgba(20,184,166,0.30), 0 18px 60px -22px rgba(20,184,166,0.55)',
        card: '0 1px 0 0 rgba(255,255,255,0.05) inset, 0 24px 60px -30px rgba(0,0,0,0.85)',
        soft: '0 18px 50px -28px rgba(0,0,0,0.9)',
      },
      backgroundImage: {
        'grid-fade': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.18), transparent 60%)',
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
        'fade-up': 'fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        'pulse-glow': 'pulseGlow 3.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-14px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.5' },
          '50%': { opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
}
