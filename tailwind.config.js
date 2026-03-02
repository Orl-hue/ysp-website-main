/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fff4ee',
          100: '#ffe6d7',
          200: '#ffccb1',
          300: '#ffa77c',
          400: '#ff844b',
          500: '#ff6a2a',
          600: '#f0531a',
          700: '#cc4012',
          800: '#a53312',
          900: '#7a260f',
        },
        peach: {
          50: '#fff8f1',
          100: '#ffeedd',
          200: '#ffd9b8',
        },
        skysoft: {
          50: '#eef6ff',
          100: '#d9eaff',
        },
        mintsoft: {
          50: '#eefbf4',
          100: '#d8f3e6',
        },
      },
      boxShadow: {
        soft: '0 14px 40px -28px rgba(255, 106, 42, 0.6)',
        card: '0 18px 45px -30px rgba(255, 106, 42, 0.65)',
        pill: '0 10px 30px -24px rgba(30, 41, 59, 0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glow: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.7s ease-out both',
        'fade-in': 'fade-in 0.6s ease-out both',
        shimmer: 'shimmer 2s infinite',
        glow: 'glow 6s ease-in-out infinite',
        float: 'float 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

