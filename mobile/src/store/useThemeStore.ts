// ============================================================
// KitchenPulse Mobile — Theme Store (Zustand + MMKV)
// Synchronous persistence for Light / Dark mode
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Appearance } from 'react-native';
import { mmkvStateStorage } from './useAuthStore';
import { ThemeMode, ThemeColors, lightColors, darkColors } from '../theme/theme';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  getColors: () => ThemeColors;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark', // default to dark titanium

      setMode: (mode: ThemeMode) => set({ mode }),

      toggleTheme: () => {
        const currentMode = get().mode;
        if (currentMode === 'dark') {
          set({ mode: 'light' });
        } else {
          set({ mode: 'dark' });
        }
      },

      getColors: () => {
        const mode = get().mode;
        if (mode === 'system') {
          const sys = Appearance.getColorScheme();
          return sys === 'light' ? lightColors : darkColors;
        }
        return mode === 'light' ? lightColors : darkColors;
      },
    }),
    {
      name: 'kitchenpulse_mobile_theme',
      storage: createJSONStorage(() => mmkvStateStorage),
    }
  )
);

/**
 * Convenient hook to consume active theme colors and mode
 */
export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const colors = useThemeStore((s) => s.getColors)();

  return {
    mode,
    setMode,
    toggleTheme,
    colors,
    isDark: colors.isDark,
  };
}
