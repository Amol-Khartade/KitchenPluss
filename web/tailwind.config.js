/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#090D16',
          surface: '#111726',
          card: '#161F33',
          hover: '#1E2942',
          border: '#24324D',
        },
        kds: {
          queue: '#38BDF8', // Sky
          firing: '#F59E0B', // Amber Flame
          completed: '#10B981', // Emerald
          cancelled: '#EF4444', // Rose Danger
          purple: '#A855F7', // AI Purple
        },
        glass: {
          50: 'rgba(255, 255, 255, 0.03)',
          100: 'rgba(255, 255, 255, 0.06)',
          200: 'rgba(255, 255, 255, 0.10)',
          300: 'rgba(255, 255, 255, 0.15)',
          surface: 'rgba(15, 23, 42, 0.70)',
          card: 'rgba(22, 31, 51, 0.60)',
          border: 'rgba(255, 255, 255, 0.09)',
          borderHover: 'rgba(255, 255, 255, 0.22)',
        },
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.45)',
        'glow-sky': '0 0 25px rgba(56, 189, 248, 0.2)',
        'glow-amber': '0 0 25px rgba(245, 158, 11, 0.25)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.2)',
        'glow-purple': '0 0 25px rgba(168, 85, 247, 0.25)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flame-glow': 'glow 1.5s ease-in-out infinite alternate',
        'float-slow': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.4)' },
          '100%': { boxShadow: '0 0 22px rgba(245, 158, 11, 0.85)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
};

