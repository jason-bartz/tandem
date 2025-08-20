/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        plum: {
          DEFAULT: '#6B46C1',
          dark: '#8B5CF6',
        },
        peach: {
          DEFAULT: '#FFB5A7',
          dark: '#FCA5A5',
        },
        sage: {
          DEFAULT: '#87A96B',
          dark: '#86EFAC',
        },
        coral: {
          DEFAULT: '#FF6B6B',
          dark: '#F87171',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease',
        'slide-up': 'slideUp 0.5s ease',
        'pulse': 'pulse 2s infinite',
        'link-snap': 'linkSnap 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'shake': 'shake 0.5s',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: 0, transform: 'translateY(20px)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          'from': { opacity: 0, transform: 'translateY(100%)' },
          'to': { opacity: 1, transform: 'translateY(0)' },
        },
        linkSnap: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(0.95)' },
          '60%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
      },
    },
  },
  plugins: [],
}