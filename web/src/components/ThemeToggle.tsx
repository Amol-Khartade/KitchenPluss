import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext.js';

interface ThemeToggleProps {
  variant?: 'pill' | 'switch' | 'buttons';
  className?: string;
  showLabels?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'pill',
  className = '',
  showLabels = false,
}) => {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === 'buttons') {
    const options: Array<{ mode: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
      { mode: 'light', label: 'Light', icon: Sun },
      { mode: 'dark', label: 'Dark', icon: Moon },
      { mode: 'system', label: 'System', icon: Monitor },
    ];

    return (
      <div className={`flex items-center p-1 rounded-2xl bg-neu-sunken shadow-neu-inset border border-black/5 dark:border-white/5 ${className}`}>
        {options.map((opt) => {
          const isActive = theme === opt.mode;
          const Icon = opt.icon;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setTheme(opt.mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-neu-surface text-sky-600 dark:text-sky-400 shadow-neu-raised border border-white/80 dark:border-white/10'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title={`Switch to ${opt.label} mode`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Interactive Neumorphic Toggle Switch Pill
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group relative flex items-center justify-between w-14 h-8 px-1 rounded-full bg-neu-sunken shadow-neu-inset border border-black/5 dark:border-white/10 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer ${className}`}
      title={`Current: ${resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}. Click to switch.`}
      aria-label={`Toggle theme (currently ${resolvedTheme})`}
    >
      {/* Background Icons */}
      <span className="flex items-center justify-center w-5 h-5 text-amber-500 transition-opacity duration-300">
        <Sun className="w-3.5 h-3.5" />
      </span>
      <span className="flex items-center justify-center w-5 h-5 text-sky-400 transition-opacity duration-300">
        <Moon className="w-3.5 h-3.5" />
      </span>

      {/* Floating Neumorphic Knob */}
      <span
        className={`absolute top-1 w-6 h-6 rounded-full bg-neu-surface shadow-neu-raised border border-white/90 dark:border-white/15 flex items-center justify-center transition-all duration-300 transform group-hover:scale-105 active:scale-95 ${
          resolvedTheme === 'dark' ? 'left-7 text-sky-400' : 'left-1 text-amber-500'
        }`}
      >
        {resolvedTheme === 'dark' ? (
          <Moon className="w-3 h-3 fill-sky-400/20" />
        ) : (
          <Sun className="w-3 h-3 fill-amber-400/20 animate-spin-slow" />
        )}
      </span>

      {showLabels && (
        <span className="sr-only">
          {resolvedTheme === 'dark' ? 'Dark Mode active' : 'Light Mode active'}
        </span>
      )}
    </button>
  );
};
