/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          50: '#FFFBF5',
          100: '#FBF7F0',
          200: '#F0E8D8',
          300: '#E0D0B8',
          500: '#8B7E74',
          700: '#5C5147',
          800: '#3D352E',
          900: '#2D2A26',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
      },
      fontSize: {
        'xxs': '0.625rem',
        'mobile': '0.9375rem',
      },
      borderRadius: {
        'bubble': '1.125rem',
        'bubble-tl': '0.25rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'bounce-dot': 'bounceDot 1.4s infinite ease-in-out both',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
