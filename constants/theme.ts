import { ViewStyle } from 'react-native';

export type ThemeColors = {
  background: string;
  card: string;
  surface: string;
  text: string;
  mutedText: string;
  secondaryText: string;
  border: string;
  primary: string;
  primaryMuted: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  accent: string;
  xpBar: string;
  xpBarBg: string;
  streak: string;
  gold: string;
  silver: string;
  bronze: string;
  gradientStart: string;
  gradientEnd: string;
  tabBar: string;
  tabActive: string;
  tabInactive: string;
  overlay: string;
};

export const lightColors: ThemeColors = {
  background: '#f2f2f7',
  card: '#ffffff',
  surface: '#ffffff',
  text: '#1c1c1e',
  mutedText: '#8e8e93',
  secondaryText: '#636366',
  border: '#d1d1d6',
  primary: '#6c5ce7',
  primaryMuted: 'rgba(108,92,231,0.12)',
  secondary: '#a29bfe',
  success: '#34c759',
  warning: '#ff9f0a',
  danger: '#ff3b30',
  accent: '#fd79a8',
  xpBar: '#6c5ce7',
  xpBarBg: '#e5e5ea',
  streak: '#f39c12',
  gold: '#f1c40f',
  silver: '#95a5a6',
  bronze: '#cd6133',
  gradientStart: '#6c5ce7',
  gradientEnd: '#a29bfe',
  tabBar: '#ffffff',
  tabActive: '#6c5ce7',
  tabInactive: '#8e8e93',
  overlay: 'rgba(0,0,0,0.4)',
};

export const darkColors: ThemeColors = {
  background: '#1a1a2e',
  card: '#0f3460',
  surface: '#16213e',
  text: '#ffffff',
  mutedText: '#636e72',
  secondaryText: '#b2bec3',
  border: '#2d3436',
  primary: '#6c5ce7',
  primaryMuted: 'rgba(108,92,231,0.25)',
  secondary: '#a29bfe',
  success: '#00b894',
  warning: '#fdcb6e',
  danger: '#d63031',
  accent: '#fd79a8',
  xpBar: '#6c5ce7',
  xpBarBg: '#2d3436',
  streak: '#f39c12',
  gold: '#f1c40f',
  silver: '#95a5a6',
  bronze: '#cd6133',
  gradientStart: '#6c5ce7',
  gradientEnd: '#a29bfe',
  tabBar: '#0f3460',
  tabActive: '#6c5ce7',
  tabInactive: '#636e72',
  overlay: 'rgba(0,0,0,0.7)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 40,
  hero: 56,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  header: 28,
  full: 999,
};

export function shadow(elevation: number = 4): ViewStyle {
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: elevation / 2 },
    shadowOpacity: 0.08 + elevation * 0.02,
    shadowRadius: elevation,
    elevation,
  };
}

// Backward compat: default Colors export points to dark theme
export const Colors = darkColors;
