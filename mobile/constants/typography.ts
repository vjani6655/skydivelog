/**
 * Jump Logs · Typography for React Native
 * Pair with fonts loaded via expo-font:
 *   "InterTight-Regular"     · 400
 *   "InterTight-Medium"      · 500
 *   "InterTight-Semibold"    · 600
 *   "InterTight-Bold"        · 700
 *   "JetBrainsMono-Regular"  · 400
 *   "JetBrainsMono-Medium"   · 500
 *   "JetBrainsMono-Semibold" · 600
 */

export const fontFamilies = {
  ui: {
    regular:  'InterTight-Regular',
    medium:   'InterTight-Medium',
    semibold: 'InterTight-SemiBold',
    bold:     'InterTight-Bold',
  },
  mono: {
    regular:  'JetBrainsMono-Regular',
    medium:   'JetBrainsMono-Medium',
    semibold: 'JetBrainsMono-SemiBold',
  },
} as const;

export const fontWeights = {
  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
} as const;

export const weights = {
  w400: '400',
  w500: '500',
  w600: '600',
  w700: '700',
} as const;

/** Letter spacing in ems — multiply by font size for RN's px-based letterSpacing. */
export const tracking = {
  tightest: -0.04,
  tighter:  -0.03,
  tight:    -0.02,
  snug:     -0.01,
  normal:   0,
  wide:     0.06,
  wider:    0.08,
  widest:   0.1,
  mega:     0.16,
} as const;

type TextStyleFontWeight =
  | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900'
  | 'normal' | 'bold';

type TypeStyle = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight?: TextStyleFontWeight;
  letterSpacing?: number;
};

const ui   = fontFamilies.ui;
const mono = fontFamilies.mono;

export const typography = {
  // ─── Labels / overlines (mono) ─────────────────────────────
  micro:    { fontFamily: mono.regular,  fontSize: 9,  lineHeight: 11, letterSpacing: 0.9  } as TypeStyle,
  caption:  { fontFamily: mono.regular,  fontSize: 10, lineHeight: 12, letterSpacing: 1.0  } as TypeStyle,
  overline: { fontFamily: mono.medium,   fontSize: 11, lineHeight: 14, letterSpacing: 0.88 } as TypeStyle,

  // ─── Body ──────────────────────────────────────────────────
  xs:       { fontFamily: ui.regular,    fontSize: 12, lineHeight: 17 } as TypeStyle,
  sm:       { fontFamily: ui.regular,    fontSize: 13, lineHeight: 20 } as TypeStyle,
  body:     { fontFamily: ui.regular,    fontSize: 14, lineHeight: 22 } as TypeStyle,
  base:     { fontFamily: ui.regular,    fontSize: 15, lineHeight: 21, letterSpacing: -0.15 } as TypeStyle,
  md:       { fontFamily: ui.medium,     fontSize: 16, lineHeight: 24, letterSpacing: -0.16 } as TypeStyle,
  lg:       { fontFamily: ui.regular,    fontSize: 17, lineHeight: 26 } as TypeStyle,

  // ─── Subheads ──────────────────────────────────────────────
  subtitle: { fontFamily: ui.semibold,   fontSize: 18, lineHeight: 25, letterSpacing: -0.36 } as TypeStyle,
  title2:   { fontFamily: ui.semibold,   fontSize: 20, lineHeight: 26, letterSpacing: -0.4  } as TypeStyle,
  title3:   { fontFamily: ui.bold,       fontSize: 22, lineHeight: 28, letterSpacing: -0.44 } as TypeStyle,
  title4:   { fontFamily: ui.bold,       fontSize: 24, lineHeight: 29, letterSpacing: -0.6  } as TypeStyle,
  title5:   { fontFamily: ui.bold,       fontSize: 26, lineHeight: 30, letterSpacing: -0.52 } as TypeStyle,

  // ─── Page titles ───────────────────────────────────────────
  h2:       { fontFamily: ui.bold,       fontSize: 28, lineHeight: 31, letterSpacing: -0.7  } as TypeStyle,
  h1:       { fontFamily: ui.bold,       fontSize: 32, lineHeight: 34, letterSpacing: -0.8  } as TypeStyle,
  h1Lg:     { fontFamily: ui.bold,       fontSize: 40, lineHeight: 42, letterSpacing: -1.2  } as TypeStyle,

  // ─── Display (marketing) ───────────────────────────────────
  displaySm: { fontFamily: ui.bold,      fontSize: 48, lineHeight: 49, letterSpacing: -1.44 } as TypeStyle,
  display:   { fontFamily: ui.bold,      fontSize: 56, lineHeight: 57, letterSpacing: -1.96 } as TypeStyle,
  displayLg: { fontFamily: ui.bold,      fontSize: 64, lineHeight: 64, letterSpacing: -2.24 } as TypeStyle,
  hero:      { fontFamily: ui.bold,      fontSize: 72, lineHeight: 71, letterSpacing: -2.88 } as TypeStyle,
  heroLg:    { fontFamily: ui.bold,      fontSize: 88, lineHeight: 84, letterSpacing: -3.52 } as TypeStyle,

  // ─── Monospace numerals (cockpit telemetry) ────────────────
  numSm:    { fontFamily: mono.medium,   fontSize: 16, lineHeight: 18 } as TypeStyle,
  num:      { fontFamily: mono.medium,   fontSize: 22, lineHeight: 23 } as TypeStyle,
  numLg:    { fontFamily: mono.medium,   fontSize: 36, lineHeight: 38 } as TypeStyle,
  numXl:    { fontFamily: mono.medium,   fontSize: 44, lineHeight: 46 } as TypeStyle,
  num2xl:   { fontFamily: mono.medium,   fontSize: 72, lineHeight: 72 } as TypeStyle,

  // ─── Button / form ─────────────────────────────────────────
  button:     { fontFamily: ui.semibold,   fontSize: 16, lineHeight: 20, letterSpacing: -0.16 } as TypeStyle,
  buttonSm:   { fontFamily: ui.medium,     fontSize: 13, lineHeight: 16 } as TypeStyle,
  input:      { fontFamily: ui.regular,    fontSize: 16, lineHeight: 22 } as TypeStyle,
  inputLabel: { fontFamily: mono.medium,   fontSize: 11, lineHeight: 14, letterSpacing: 0.66  } as TypeStyle,
  chip:       { fontFamily: ui.medium,     fontSize: 13, lineHeight: 16 } as TypeStyle,
  badge:      { fontFamily: mono.medium,   fontSize: 11, lineHeight: 14, letterSpacing: 0.22  } as TypeStyle,
} as const;

export type TypographyToken = keyof typeof typography;

export default typography;
