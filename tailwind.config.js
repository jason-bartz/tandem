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
        // High Contrast colors
        hc: {
          primary: 'var(--hc-primary)',
          'primary-text': 'var(--hc-primary-text)',
          success: 'var(--hc-success)',
          error: 'var(--hc-error)',
          warning: 'var(--hc-warning)',
          background: 'var(--hc-background)',
          surface: 'var(--hc-surface)',
          text: 'var(--hc-text)',
          border: 'var(--hc-border)',
          focus: 'var(--hc-focus)',
        },
        // Violet/Purple - complementing sky blues
        plum: {
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
          light: '#A78BFA',
        },
        // Warm sunset tones
        peach: {
          DEFAULT: '#FB923C',
          dark: '#EA580C',
          light: '#FED7AA',
        },
        // Nature greens - matching landscape
        sage: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#86EFAC',
        },
        // Coral accents
        coral: {
          DEFAULT: '#F87171',
          dark: '#EF4444',
          light: '#FCA5A5',
        },
        // Additional custom colors
        'warm-yellow': '#FCD34D',
        'light-sand': '#FEF3C7',
        'off-white': '#FFFBEB',
        'gray-text': '#6B7280',
        'dark-text': '#1F2937',
        'border-color': '#E5E7EB',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease',
        'slide-up': 'slideUp 0.5s ease',
        pulse: 'pulse 2s infinite',
        'link-snap': 'linkSnap 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shake: 'shake 0.5s',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(100%)' },
          to: { opacity: 1, transform: 'translateY(0)' },
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
        bounceIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.3) translateY(-20px)',
          },
          '50%': {
            opacity: '0.9',
            transform: 'scale(1.05) translateY(-5px)',
          },
          '70%': {
            transform: 'scale(0.95) translateY(0)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
};
