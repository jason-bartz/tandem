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
        // New minimal pastel accent colors
        accent: {
          green: '#7ed957',
          yellow: '#ffce00',
          pink: '#ff66c4',
          blue: '#38b6ff',
          red: '#ff5757',
          orange: '#ff751f',
        },
        // Background colors
        'bg-primary': 'var(--bg-primary)',
        'bg-surface': 'var(--bg-surface)',
        'bg-card': 'var(--bg-card)',
        // Text colors
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        // Border
        'border-main': 'var(--border-color)',
        'border-light': 'var(--border-light)',
        // Legacy colors for backward compatibility
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

        // Micro-animations (Answer Row - 1.3)
        'correct-celebration': 'correctCelebration 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'gradient-sweep': 'gradientSweep 800ms ease-out',
        'soft-glow': 'softGlowPulse 2s ease-in-out infinite',
        'enhanced-shake': 'enhancedShake 500ms cubic-bezier(0.4, 0, 0.6, 1)',
        'focus-pulse': 'focusPulse 2s ease-in-out infinite',

        // Emoji animations (1.4)
        'hover-tilt': 'hoverTilt 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'touch-squish': 'touchSquish 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'victory-wiggle': 'victoryWiggle 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'loading-pulse': 'loadingPulse 1.5s ease-in-out infinite',

        // Stats animations (2.1, 2.2)
        'count-up': 'countUp 400ms cubic-bezier(0, 0, 0.2, 1)',
        'timer-bounce': 'timerBounce 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'milestone-burst': 'milestoneBurst 500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'progress-fill': 'progressFill 800ms cubic-bezier(0.4, 0, 0.2, 1) forwards',

        // Button animations (3.1, 3.2, 3.3)
        'hover-lift': 'hoverLift 150ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'touch-press': 'touchPress 100ms cubic-bezier(0.4, 0, 1, 1) forwards',
        'spring-release': 'springRelease 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'icon-rotate': 'iconRotate 150ms ease-out forwards',
        'disabled-pulse': 'disabledPulse 2s ease-in-out infinite',
        'toggle-slide': 'toggleSlide 250ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        'toggle-morph': 'toggleMorph 250ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        'close-rotate': 'closeRotate 200ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'bg-pulse': 'backgroundPulse 1.5s ease-in-out infinite',

        // Loading animations (4.2)
        'skeleton-shimmer': 'skeletonShimmer 2s ease-in-out infinite',
        'ios-spinner': 'iosSpinner 1s linear infinite',

        // Empty state animations (4.3)
        'gentle-float-long': 'gentleFloat 3s ease-in-out infinite',
        'content-fade': 'contentFadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards',

        // Share button animations (5.2)
        'attention-pulse': 'attentionPulse 2s ease-in-out infinite',
        'hover-shine': 'hoverShine 600ms ease-out',
        'success-burst': 'successBurst 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
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
        // Micro-animations: Answer Row (1.3)
        correctCelebration: {
          '0%': { transform: 'scale(1)' },
          '10%': { transform: 'scale(0.98)' },
          '40%': { transform: 'scale(1.02)' },
          '60%': { transform: 'scale(0.99)' },
          '80%': { transform: 'scale(1.01)' },
          '100%': { transform: 'scale(1)' },
        },
        gradientSweep: {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '-200% center' },
        },
        softGlowPulse: {
          '0%, 100%': { boxShadow: '0 0 0 rgba(13, 148, 136, 0)' },
          '50%': { boxShadow: '0 0 20px rgba(13, 148, 136, 0.4)' },
        },
        enhancedShake: {
          '0%, 100%': { transform: 'translateX(0) rotate(0deg)' },
          '10%': { transform: 'translateX(-8px) rotate(-1deg)' },
          '30%': { transform: 'translateX(8px) rotate(1deg)' },
          '50%': { transform: 'translateX(-6px) rotate(-0.5deg)' },
          '70%': { transform: 'translateX(6px) rotate(0.5deg)' },
          '90%': { transform: 'translateX(-2px) rotate(0deg)' },
        },
        focusPulse: {
          '0%, 100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 2px rgba(14, 165, 233, 0.5)',
          },
          '50%': {
            transform: 'scale(1.01)',
            boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.3)',
          },
        },
        // Emoji animations (1.4)
        hoverTilt: {
          '0%': { transform: 'perspective(500px) rotateY(0deg) rotateX(0deg)' },
          '100%': { transform: 'perspective(500px) rotateY(5deg) rotateX(-5deg)' },
        },
        touchSquish: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.92)' },
          '100%': { transform: 'scale(1)' },
        },
        victoryWiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-8deg) scale(1.1)' },
          '75%': { transform: 'rotate(8deg) scale(1.1)' },
        },
        loadingPulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        // Stats animations (2.1, 2.2)
        countUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        timerBounce: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
        milestoneBurst: {
          '0%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)',
          },
          '50%': { transform: 'scale(1.15)' },
          '100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 20px rgba(59, 130, 246, 0)',
          },
        },
        progressFill: {
          '0%': { width: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '100%': { width: 'var(--target-width)', opacity: '1' },
        },
        // Button animations (3.1, 3.2, 3.3)
        hoverLift: {
          '0%': {
            transform: 'translateY(0)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
          '100%': {
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
        touchPress: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(0.96)' },
        },
        springRelease: {
          '0%': { transform: 'scale(0.96)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
        iconRotate: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(5deg)' },
        },
        disabledPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.7' },
        },
        toggleSlide: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(var(--slide-distance))' },
        },
        toggleMorph: {
          '0%': { background: 'var(--color-from)' },
          '100%': { background: 'var(--color-to)' },
        },
        closeRotate: {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '100%': { transform: 'rotate(90deg) scale(0.9)' },
        },
        backgroundPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
        // Loading animations (4.2)
        skeletonShimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        iosSpinner: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Empty state & Share button (4.3, 5.2)
        gentleFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        contentFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        attentionPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        hoverShine: {
          '0%': { backgroundPosition: '-100% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        successBurst: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        scaleFadeIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.95)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
      },
    },
  },
  plugins: [],
};
