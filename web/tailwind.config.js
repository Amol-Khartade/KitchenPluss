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
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flame-glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.4)' },
          '100%': { boxShadow: '0 0 18px rgba(245, 158, 11, 0.8)' },
        }
      }
    },
  },
  plugins: [],
};
