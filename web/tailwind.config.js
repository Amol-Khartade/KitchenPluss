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
          primary: 'var(--neu-bg-base)',
          surface: 'var(--neu-bg-surface)',
          card: 'var(--neu-bg-card)',
          hover: 'var(--neu-bg-hover)',
          border: 'var(--neu-border)',
        },
        neu: {
          base: 'var(--neu-bg-base)',
          surface: 'var(--neu-bg-surface)',
          card: 'var(--neu-bg-card)',
          sunken: 'var(--neu-bg-sunken)',
          hover: 'var(--neu-bg-hover)',
          border: 'var(--neu-border)',
          borderSubtle: 'var(--neu-border-subtle)',
        },
        kds: {
          queue: '#0284C7', // Sky
          firing: '#F59E0B', // Amber Flame
          completed: '#10B981', // Emerald
          cancelled: '#EF4444', // Rose Danger
          purple: '#8B5CF6', // AI Purple
        },
        glass: {
          50: 'rgba(255, 255, 255, 0.04)',
          100: 'rgba(255, 255, 255, 0.08)',
          200: 'rgba(255, 255, 255, 0.12)',
          300: 'rgba(255, 255, 255, 0.18)',
          surface: 'var(--neu-bg-surface)',
          card: 'var(--neu-bg-card)',
          border: 'var(--neu-border)',
          borderHover: 'rgba(56, 189, 248, 0.35)',
        },
      },
      boxShadow: {
        'glass': 'var(--shadow-neu-raised)',
        'glass-sm': 'var(--shadow-neu-raised-sm)',
        'glass-lg': 'var(--shadow-neu-raised-lg)',
        'neu-raised': 'var(--shadow-neu-raised)',
        'neu-raised-sm': 'var(--shadow-neu-raised-sm)',
        'neu-raised-lg': 'var(--shadow-neu-raised-lg)',
        'neu-inset': 'var(--shadow-neu-inset)',
        'neu-inset-sm': 'var(--shadow-neu-inset-sm)',
        'glow-sky': '0 0 20px rgba(56, 189, 248, 0.35)',
        'glow-amber': '0 0 22px rgba(245, 158, 11, 0.35)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.35)',
        'glow-purple': '0 0 22px rgba(139, 92, 246, 0.35)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flame-glow': 'glow 1.5s ease-in-out infinite alternate',
        'float-slow': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 6px rgba(245, 158, 11, 0.4)' },
          '100%': { boxShadow: '0 0 24px rgba(245, 158, 11, 0.85)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
};
