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
      height: {
        screen: ['100vh', '100dvh'], // Support for dynamic viewport height
        svh: '100svh', // Small viewport height
        lvh: '100lvh', // Large viewport height
        dvh: '100dvh', // Dynamic viewport height
      },
      minHeight: {
        screen: ['100vh', '100dvh'],
        svh: '100svh',
        lvh: '100lvh',
        dvh: '100dvh',
      },
      maxHeight: {
        screen: ['100vh', '100dvh'],
        svh: '100svh',
        lvh: '100lvh',
        dvh: '100dvh',
      },
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
        // Legacy animations (keep for compatibility)
        'fade-in': 'fadeIn 0.5s ease',
        'slide-up': 'slideUp 0.5s ease',
        pulse: 'pulse 2s infinite',
        'link-snap': 'linkSnap 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        shake: 'shake 0.5s',
        'bounce-in': 'bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',

        // New premium animations (iOS native feel)
        'screen-enter': 'screenEnterRight 350ms cubic-bezier(0, 0, 0.58, 1)',
        'screen-exit': 'screenExitLeft 300ms cubic-bezier(0.42, 0, 1, 1)',
        'slide-up-enter': 'slideUpFromBottom 350ms cubic-bezier(0, 0, 0.58, 1)',
        'fade-zoom': 'fadeZoomIn 350ms cubic-bezier(0, 0, 0.58, 1)',
        'modal-enter': 'modalEnter 300ms cubic-bezier(0.5, 1.2, 0.5, 1)',
        'modal-exit': 'modalExit 200ms cubic-bezier(0.42, 0, 1, 1)',
        'backdrop-enter': 'backdropFadeIn 200ms cubic-bezier(0, 0, 0.58, 1)',
        'button-tap': 'buttonTap 100ms cubic-bezier(0.4, 0, 0.6, 1)',
        'correct-pulse': 'correctPulse 350ms cubic-bezier(0.5, 1.2, 0.5, 1)',
        'error-shake': 'errorShake 350ms cubic-bezier(0.4, 0, 0.6, 1)',
        'letter-reveal': 'letterReveal 300ms cubic-bezier(0.5, 1.2, 0.5, 1)',
        'gentle-float': 'gentleFloat 2s cubic-bezier(0.42, 0, 0.58, 1) infinite',
        'fade-in-up': 'fadeInUp 300ms cubic-bezier(0, 0, 0.58, 1)',
        'scale-fade-in': 'scaleFadeIn 300ms cubic-bezier(0, 0, 0.58, 1)',
        'success-bounce': 'successBounce 600ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.42, 0, 0.58, 1) infinite',
      },
      transitionDuration: {
        instant: '100ms',
        fast: '200ms',
        standard: '300ms',
        prominent: '350ms',
        celebration: '500ms',
        extended: '600ms',
      },
      transitionTimingFunction: {
        'ios-default': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'ios-ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
        'ios-ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'spring-soft': 'cubic-bezier(0.5, 1.2, 0.5, 1)',
        'spring-bouncy': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
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
