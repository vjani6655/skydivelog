/**
 * SkydiveLog · Design tokens for React Native
 * Mirror of tailwind.config.js — same values, plain TS constants.
 */

export const colors = {
  // ─── Surfaces ──────────────────────────────────────────────
  bg:            '#0A1220',
  surface:       '#121C2E',
  surface2:      '#1A2740',
  surface3:      '#243349',
  border:        '#243349',
  borderStrong:  '#2F4060',

  // ─── Foreground ────────────────────────────────────────────
  fg:            '#E8EEF8',
  fg2:           '#8B9BB5',
  fg3:           '#5A6B85',
  fg4:           '#3D4E6A',

  // ─── Accents ───────────────────────────────────────────────
  sky:           '#4A9EFF',
  skyDim:        '#2A6FB8',
  skyBg:         'rgba(74, 158, 255, 0.12)',
  cyan:          '#34D2D6',

  // ─── Status ────────────────────────────────────────────────
  warn:          '#FFB74A',
  warnBg:        'rgba(255, 183, 74, 0.12)',
  danger:        '#FF6B6B',
  dangerBg:      'rgba(255, 107, 107, 0.12)',
  ok:            '#4ADE80',
  okBg:          'rgba(74, 222, 128, 0.12)',

  // ─── On-accent text ────────────────────────────────────────
  onSky:         '#001426',
} as const;

export type ColorToken = keyof typeof colors;

export const spacing = {
  0:   0,
  0.5: 2,
  1:   4,
  1.5: 6,
  2:   8,
  2.5: 10,
  3:   12,
  3.5: 14,
  4:   16,
  4.5: 18,
  5:   20,
  5.5: 22,
  6:   24,
  7:   28,
  8:   32,
  9:   36,
  10:  40,
  11:  44,
  12:  48,
  14:  56,
  16:  64,
  18:  72,
  20:  80,
  24:  96,
  28:  112,
  32:  128,
} as const;

export const radii = {
  none: 0,
  sm:   6,
  base: 8,
  md:   10,
  lg:   14,
  xl:   16,
  '2xl': 20,
  '3xl': 26,
  pill: 999,
} as const;

export const borderWidths = {
  0: 0,
  hairline: StyleSheetHairline(),
  1: 1,
  2: 2,
  3: 3,
} as const;

function StyleSheetHairline(): number {
  // Lazy require so this file is safe to import outside RN (e.g. in storybook).
  try {
    const { StyleSheet } = require('react-native');
    return StyleSheet.hairlineWidth;
  } catch {
    return 1;
  }
}

/** React Native shadows are platform-split. */
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  pop: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.6,
    shadowRadius: 60,
    elevation: 16,
  },
  glow: {
    shadowColor: colors.sky,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 60,
    elevation: 12,
  },
  device: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.18,
    shadowRadius: 80,
    elevation: 24,
  },
} as const;

export const durations = {
  fast: 120,
  base: 160,
  slow: 240,
} as const;

export const gradients = {
  heroGlow:  ['rgba(74,158,255,0.12)', 'transparent'] as const,
  authGlow:  ['rgba(74,158,255,0.15)', 'transparent'] as const,
  cardPromo: ['rgba(74,158,255,0.18)', 'rgba(52,210,214,0.05)'] as const,
  cockpit:   ['rgba(74,158,255,0.15)', '#121C2E'] as const,
};

export const zIndices = {
  base: 0,
  card: 1,
  sticky: 10,
  overlay: 20,
  modal: 30,
  toast: 40,
  tooltip: 50,
} as const;

export const tokens = {
  colors,
  spacing,
  radii,
  borderWidths,
  shadows,
  durations,
  gradients,
  zIndices,
} as const;

export default tokens;
