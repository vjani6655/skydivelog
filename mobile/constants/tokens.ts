/**
 * Jump Logs · Design tokens for React Native
 * Mirror of tailwind.config.ts — same values, plain TS constants.
 */

export const darkColors = {
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
  onSky:         '#FFFFFF',
} as const;

export const lightColors = {
  // ─── Surfaces ──────────────────────────────────────────────
  bg:            '#F2F5FA',
  surface:       '#FFFFFF',
  surface2:      '#EDF1F8',
  surface3:      '#E2E8F2',
  border:        '#D4DCE8',
  borderStrong:  '#B8C6D8',

  // ─── Foreground ────────────────────────────────────────────
  fg:            '#0C1829',
  fg2:           '#3A4F68',
  fg3:           '#6B80A0',
  fg4:           '#9BADC2',

  // ─── Accents ───────────────────────────────────────────────
  sky:           '#2176CC',
  skyDim:        '#1557A0',
  skyBg:         'rgba(33, 118, 204, 0.08)',
  cyan:          '#0B8FA2',

  // ─── Status ────────────────────────────────────────────────
  warn:          '#C46A00',
  warnBg:        'rgba(196, 106, 0, 0.08)',
  danger:        '#C82020',
  dangerBg:      'rgba(200, 32, 32, 0.08)',
  ok:            '#1A8740',
  okBg:          'rgba(26, 135, 64, 0.08)',

  // ─── On-accent text ────────────────────────────────────────
  onSky:         '#FFFFFF',
} as const;

/** Static dark-mode alias kept for any module that imports colors directly. */
export const colors = darkColors;

export type ColorSet = { readonly [K in keyof typeof darkColors]: string };
export type ColorToken = keyof typeof darkColors;

export const spacing = {
  0:   0,   0.5: 2,   1:   4,   1.5: 6,
  2:   8,   2.5: 10,  3:   12,  3.5: 14,
  4:   16,  4.5: 18,  5:   20,  5.5: 22,
  6:   24,  7:   28,  8:   32,  9:   36,
  10:  40,  11:  44,  12:  48,  14:  56,
  16:  64,  18:  72,  20:  80,  24:  96,
  28:  112, 32:  128,
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
    shadowColor: '#4A9EFF',
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
  base:    0,
  card:    1,
  sticky:  10,
  overlay: 20,
  modal:   30,
  toast:   40,
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
