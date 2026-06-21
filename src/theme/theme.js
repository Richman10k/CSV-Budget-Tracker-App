/**
 * Central design tokens for CSV Budget Tracker.
 *
 * Premium dark "Liquid Glass" finance aesthetic:
 *   - true-black (#0A0A0A) backdrop with subtle bleed-through
 *   - frosted, semi-transparent surfaces with thin glowing borders
 *   - neon indigo (#6366F1) accent for interactive chrome + glow
 *   - green for income / positive, red for expenses / negative
 *
 * Everything visual references these tokens so there are no scattered
 * hard-coded colors / sizes across the app. Surfaces are intentionally
 * translucent so they "float" over the deep-black background — the whole app
 * is rendered on a #0A0A0A canvas, which makes the rgba() surfaces read as
 * frosted glass without needing a native blur module.
 */
import {MD3DarkTheme} from 'react-native-paper';

export const colors = {
  // Surfaces — deep black canvas + translucent frosted glass layers.
  background: '#0A0A0A', // app background (true black)
  backgroundElevated: '#101116', // headers / chrome that needs a hair of lift
  surface: 'rgba(32, 34, 48, 0.78)', // cards (frosted)
  surfaceElevated: 'rgba(44, 46, 64, 0.92)', // raised cards / sheets (frosted)
  surfaceMuted: 'rgba(72, 75, 100, 0.55)', // chips, inputs, progress tracks
  surfaceSolid: '#15161E', // opaque fallback when no bleed is wanted

  // Frosted-glass semantic tokens (Liquid Glass).
  cardFrost: 'rgba(32, 34, 48, 0.78)',
  cardFrostElevated: 'rgba(44, 46, 64, 0.92)',
  borderFrost: 'rgba(255, 255, 255, 0.12)', // thin glowing edge
  borderFrostStrong: 'rgba(255, 255, 255, 0.20)',
  frostHighlight: 'rgba(255, 255, 255, 0.10)', // top light-reflection sheen
  glowFrost: 'rgba(99, 102, 241, 0.35)', // accent glow bleed

  // Text
  text: '#FFFFFF',
  textSecondary: '#AEB4C6',
  textMuted: '#727892',

  // Accent (neon indigo) — primary interactive color.
  accent: '#6366F1',
  accentBright: '#818CF8', // lighter stop for gradients / glints
  accentDim: 'rgba(99, 102, 241, 0.16)', // tinted icon wells
  accentPressed: '#4F46E5',
  onAccent: '#FFFFFF', // foreground on accent fills (indigo needs white)
  glow: 'rgba(99, 102, 241, 0.55)', // accent shadow glow

  // Semantic money colors
  income: '#22C55E', // green — money in
  expense: '#EF4444', // red — money out
  warning: '#F59E0B', // amber — flags / alerts
  info: '#38BDF8', // sky — neutral info

  // Lines / borders (frosted hairlines)
  border: 'rgba(255, 255, 255, 0.10)',
  borderStrong: 'rgba(255, 255, 255, 0.18)',

  // Misc
  ripple: 'rgba(99, 102, 241, 0.22)',
  overlay: 'rgba(6, 7, 12, 0.72)', // modal backdrop scrim
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

/**
 * A fixed, color-blind-friendly palette used to color-code spending
 * categories consistently across charts and lists. Refreshed for the neon
 * 2025-26 fintech look (indigo-forward, vivid).
 */
export const categoryPalette = [
  '#6366F1', // indigo
  '#22C55E', // emerald
  '#F59E0B', // amber
  '#EF4444', // red
  '#A855F7', // purple
  '#06B6D4', // cyan
  '#F97316', // orange
  '#84CC16', // lime
  '#EC4899', // pink
  '#8B5CF6', // violet
  '#3B82F6', // blue
  '#14B8A6', // teal
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

/**
 * Budget health for a spend vs. limit, used to color progress bars and labels
 * consistently across the Budget and Home screens:
 *   - no limit set        -> muted/neutral
 *   - under ~85%          -> green (healthy)
 *   - 85–100%             -> amber (getting close)
 *   - over the limit      -> red (over budget)
 * A $0 limit is a real "spend nothing" target: any spend is over.
 */
export function budgetStatus(spent = 0, limit = 0, hasLimit = limit > 0) {
  if (!hasLimit) {
    return {state: 'none', color: colors.textMuted, ratio: 0};
  }
  if (limit <= 0) {
    return spent > 0
      ? {state: 'over', color: colors.expense, ratio: 1}
      : {state: 'ok', color: colors.income, ratio: 0};
  }
  const ratio = spent / limit;
  if (ratio > 1) {
    return {state: 'over', color: colors.expense, ratio};
  }
  if (ratio >= 0.85) {
    return {state: 'near', color: colors.warning, ratio};
  }
  return {state: 'ok', color: colors.income, ratio};
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
  xxxl: 48,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 24, // premium card roundness
  xl: 30,
  pill: 999,
};

export const typography = {
  // Readable sizes — body is 16px minimum per the design spec.
  display: {fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -0.6},
  title: {fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.3},
  heading: {fontSize: 18, fontWeight: '700', color: colors.text, letterSpacing: -0.2},
  body: {fontSize: 16, fontWeight: '500', color: colors.text},
  label: {fontSize: 14, fontWeight: '600', color: colors.textSecondary},
  caption: {fontSize: 12, fontWeight: '500', color: colors.textMuted},
  mono: {fontSize: 16, fontWeight: '700', color: colors.text},
  overline: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
};

/**
 * Layered depth system. `card`/`floating` are neutral black drop-shadows for
 * tactility; `glow` is a colored accent halo for hero/active elements.
 */
// NOTE: elevations are kept low and consistent. On Android, elevation defines
// z-order across the whole window, so large elevations make cards draw over
// neighbours / over the FAB ("UI over UI"). Keep these small; the FAB sets its
// own high elevation explicitly so it always floats on top.
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.accent,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 3,
  },
};

/** A subtle colored glow for accent surfaces (kept low-elevation on purpose). */
export function glowShadow(color = colors.accent, opacity = 0.3, blur = 10) {
  return {
    shadowColor: color,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation: 2,
  };
}

/**
 * Reusable frosted-glass surface styles. `glass.base` is the standard card;
 * `glass.elevated` floats higher with a deeper shadow. The FrostedCard
 * component layers an SVG sheen + glowing border on top of these.
 */
export const glass = {
  base: {
    backgroundColor: colors.cardFrost,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFrost,
    overflow: 'hidden',
  },
  elevated: {
    backgroundColor: colors.cardFrostElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderFrost,
    overflow: 'hidden',
    ...shadow.card,
  },
};

/** Flat object form of the frosted card style (per design spec export). */
export const frostedCardStyle = {...glass.elevated};

/** Gradient color stops used by SVG sheens and hero backdrops. */
export const gradients = {
  hero: ['#15131F', '#0C0B12', '#0A0A0A'], // subtle indigo-tinted top glow
  accent: ['#818CF8', '#6366F1'],
  accentSoft: ['rgba(129,140,248,0.28)', 'rgba(99,102,241,0)'],
  frost: ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0)'],
};

/** Motion tokens (static reference; FrameRateManager tunes these per device). */
export const motion = {
  fast: 140,
  base: 240,
  slow: 380,
  pressScale: 0.97,
  spring: {damping: 18, stiffness: 220, mass: 0.7},
  springGentle: {damping: 20, stiffness: 150, mass: 0.9},
};

/** React Native Paper dark theme derived from our tokens. */
export const paperTheme = {
  ...MD3DarkTheme,
  dark: true,
  roundness: radius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    onPrimary: colors.onAccent,
    secondary: colors.accentBright,
    background: colors.background,
    surface: colors.surfaceSolid,
    surfaceVariant: '#22232E',
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary,
    outline: colors.border,
    error: colors.expense,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level0: colors.background,
      level1: colors.surfaceSolid,
      level2: '#1B1C26',
      level3: '#1F2030',
    },
  },
};

/** React Navigation dark theme derived from our tokens. */
export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
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
  subscriptionStatusColor,
  budgetStatus,
  spacing,
  radius,
  typography,
  shadow,
  glowShadow,
  glass,
  frostedCardStyle,
  gradients,
  motion,
  paperTheme,
  navigationTheme,
};
