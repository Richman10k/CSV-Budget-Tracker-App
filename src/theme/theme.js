/**
 * Central design tokens for CSV Budget Tracker.
 *
 * Dark-mode only, professional banking aesthetic:
 *   - near-black backgrounds, white text, gray accents
 *   - green for income / positive, red for expenses / negative
 *   - a single emerald accent (active tabs, buttons, chart highlights)
 *
 * Everything visual references these tokens so there are no scattered
 * hard-coded colors / sizes across the app.
 */
import {MD3DarkTheme} from 'react-native-paper';

export const colors = {
  // Surfaces (layered near-blacks for depth)
  background: '#0A0B0D', // app background
  surface: '#121419', // cards
  surfaceElevated: '#1A1D24', // raised cards / sheets
  surfaceMuted: '#22262F', // chips, inputs

  // Text
  text: '#FFFFFF',
  textSecondary: '#A2A8B4',
  textMuted: '#6B7280',

  // Accent (emerald) — primary interactive color
  accent: '#00C853',
  accentDim: '#0B3D24',
  accentPressed: '#00A846',

  // Semantic money colors
  income: '#00C853', // green — money in
  expense: '#FF5252', // red — money out
  warning: '#FFB300', // amber — flags / alerts
  info: '#4FC3F7', // light blue — neutral info

  // Lines / borders
  border: '#262A33',
  borderStrong: '#333944',

  // Misc
  ripple: 'rgba(0, 200, 83, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

/**
 * A fixed, color-blind-friendly palette used to color-code spending
 * categories consistently across charts and lists.
 */
export const categoryPalette = [
  '#00C853', // emerald
  '#4FC3F7', // sky
  '#FFB300', // amber
  '#FF5252', // red
  '#AB47BC', // purple
  '#26C6DA', // cyan
  '#FF7043', // deep orange
  '#9CCC65', // lime
  '#EC407A', // pink
  '#7E57C2', // violet
  '#5C6BC0', // indigo
  '#78909C', // blue gray
];

/**
 * Color for a subscription by status: active charges are red (money going out),
 * cancelled is green (money saved), trial is amber/yellow.
 */
export function subscriptionStatusColor(status) {
  if (status === 'cancelled') {
    return colors.income; // green
  }
  if (status === 'trial') {
    return colors.warning; // yellow
  }
  return colors.expense; // active = red
}

/** Deterministically pick a stable color for a category name. */
export function colorForCategory(name) {
  const key = String(name || 'Uncategorized');
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return categoryPalette[hash % categoryPalette.length];
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 28,
  pill: 999,
};

export const typography = {
  // Readable sizes — body is 16px minimum per the design spec.
  display: {fontSize: 34, fontWeight: '800', color: colors.text},
  title: {fontSize: 22, fontWeight: '700', color: colors.text},
  heading: {fontSize: 18, fontWeight: '700', color: colors.text},
  body: {fontSize: 16, fontWeight: '500', color: colors.text},
  label: {fontSize: 14, fontWeight: '600', color: colors.textSecondary},
  caption: {fontSize: 12, fontWeight: '500', color: colors.textMuted},
  mono: {fontSize: 16, fontWeight: '700', color: colors.text},
};

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
};

/** React Native Paper dark theme derived from our tokens. */
export const paperTheme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: radius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    onPrimary: colors.black,
    secondary: colors.info,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceMuted,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.expense,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: colors.background,
      level1: colors.surface,
      level2: colors.surfaceElevated,
      level3: colors.surfaceElevated,
    },
  },
};

/** React Navigation dark theme derived from our tokens. */
export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  // React Navigation v7 requires a `fonts` descriptor on custom themes.
  fonts: {
    regular: {fontFamily: 'System', fontWeight: '400'},
    medium: {fontFamily: 'System', fontWeight: '500'},
    bold: {fontFamily: 'System', fontWeight: '700'},
    heavy: {fontFamily: 'System', fontWeight: '800'},
  },
};

export default {
  colors,
  categoryPalette,
  colorForCategory,
  spacing,
  radius,
  typography,
  shadow,
  paperTheme,
  navigationTheme,
};
