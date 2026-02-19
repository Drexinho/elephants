/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './blog.html',
    './admin.html',
    './src/**/*.{js,ts,html}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f5f5f4',
          100: '#e6e4e0',
          200: '#d0ccc5',
          300: '#b0a99e',
          400: '#8c8376',
          500: '#6b6358',
          600: '#524c43',
          700: '#3d3932',
          800: '#252220',
          900: '#0a1616',
          950: '#030d0d',
        },
        accent: {
          50: '#fff9e6',
          100: '#ffefb8',
          200: '#ffe066',
          300: '#ffd233',
          400: '#f5c000',
          500: '#e6b000',
          600: '#c99700',
          700: '#a67c00',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'slide-up-lg': 'slideUpLg 0.7s ease-out forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideUpLg: { '0%': { opacity: '0', transform: 'translateY(32px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        'brutal': '4px 4px 0 0 rgba(10, 22, 22, 0.15)',
        'brutal-lg': '8px 8px 0 0 rgba(10, 22, 22, 0.2)',
      },
    },
  },
  plugins: [],
}
