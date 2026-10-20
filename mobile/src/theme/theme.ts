// ============================================================
// KitchenPulse Mobile — Neumorphic Theme Tokens
// Soft UI physics, dual-direction shadows, WCAG AA contrast
// ============================================================

import { ViewStyle, TextStyle } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  isDark: boolean;
  base: string;
  surface: string;
  card: string;
  cardHighlight: string;
  sunken: string;
  border: string;
  borderSubtle: string;
  borderHighlight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Semantic Kitchen Accents
  accentSky: string;
  accentSkyBg: string;
  accentAmber: string;
  accentAmberBg: string;
  accentEmerald: string;
  accentEmeraldBg: string;
  accentRose: string;
  accentRoseBg: string;
  accentPurple: string;
  accentPurpleBg: string;
  accentIndigo: string;

  // Neumorphic Shadows
  shadowRaised: ViewStyle;
  shadowRaisedSm: ViewStyle;
  shadowRaisedLg: ViewStyle;
  shadowSunken: ViewStyle;
}

export const lightColors: ThemeColors = {
  isDark: false,
  base: '#EEF2F6',
  surface: '#F4F7FA',
  card: '#FFFFFF',
  cardHighlight: 'rgba(255, 255, 255, 0.95)',
  sunken: '#E2E8F0',
  border: '#CBD5E1',
  borderSubtle: '#E2E8F0',
  borderHighlight: 'rgba(255, 255, 255, 0.9)',
  textPrimary: '#0F172A',     // Slate-900 (High contrast)
  textSecondary: '#334155',   // Slate-700
  textMuted: '#64748B',       // Slate-500

  accentSky: '#0284C7',       // Sky-600
  accentSkyBg: 'rgba(2, 132, 199, 0.12)',
  accentAmber: '#D97706',     // Amber-600
  accentAmberBg: 'rgba(217, 119, 6, 0.14)',
  accentEmerald: '#059669',   // Emerald-600
  accentEmeraldBg: 'rgba(5, 150, 105, 0.14)',
  accentRose: '#E11D48',      // Rose-600
  accentRoseBg: 'rgba(225, 29, 72, 0.14)',
  accentPurple: '#7C3AED',    // Purple-600
  accentPurpleBg: 'rgba(124, 58, 237, 0.12)',
  accentIndigo: '#4F46E5',

  shadowRaised: {
    shadowColor: '#94A3B8',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowRaisedSm: {
    shadowColor: '#94A3B8',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowRaisedLg: {
    shadowColor: '#94A3B8',
    shadowOffset: { width: 6, height: 7 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  shadowSunken: {
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
};

export const darkColors: ThemeColors = {
  isDark: true,
  base: '#0F131D',
  surface: '#141824',
  card: '#181E2E',
  cardHighlight: 'rgba(255, 255, 255, 0.05)',
  sunken: '#090D15',
  border: 'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderHighlight: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#F8FAFC',     // Slate-50
  textSecondary: '#CBD5E1',   // Slate-300
  textMuted: '#94A3B8',       // Slate-400

  accentSky: '#38BDF8',       // Sky-400
  accentSkyBg: 'rgba(56, 189, 248, 0.15)',
  accentAmber: '#F59E0B',     // Amber-400
  accentAmberBg: 'rgba(245, 158, 11, 0.18)',
  accentEmerald: '#10B981',   // Emerald-400
  accentEmeraldBg: 'rgba(16, 185, 129, 0.16)',
  accentRose: '#F43F5E',      // Rose-400
  accentRoseBg: 'rgba(244, 63, 94, 0.18)',
  accentPurple: '#A78BFA',    // Purple-400
  accentPurpleBg: 'rgba(167, 139, 250, 0.16)',
  accentIndigo: '#818CF8',

  shadowRaised: {
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius: 12,
    elevation: 6,
  },
  shadowRaisedSm: {
    shadowColor: '#000000',
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  shadowRaisedLg: {
    shadowColor: '#000000',
    shadowOffset: { width: 6, height: 9 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
    elevation: 10,
  },
  shadowSunken: {
    backgroundColor: '#090D15',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
};
