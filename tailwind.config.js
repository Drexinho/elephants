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
        /* Doplňte podle značky – např. font-sans, font-display */
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* Doplňte barvy podle značky – sémantické názvy primary, accent, neutral */
        primary: {
          50: '#f7f5f2',
          100: '#eae6e1',
          200: '#d8d3cb',
          300: '#bdb6ab',
          400: '#9d9588',
          500: '#7a7266',
          600: '#5e574d',
          700: '#454039',
          800: '#2d2a25',
          900: '#092727',
          950: '#051818',
        },
        accent: {
          50: '#fdf9e7',
          100: '#faf3c9',
          400: '#f2dc6a',
          500: '#edd14f',
          600: '#d9bc2a',
          700: '#c4a71f',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
