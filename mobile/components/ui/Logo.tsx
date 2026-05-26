import Svg, { Path, Line, Rect } from 'react-native-svg';

type LogoVariant = 'dark' | 'light' | 'mono';

interface LogoProps {
  size?: number;
  variant?: LogoVariant;
  color?: string;
}

/**
 * Open-canopy logo mark.
 * variant="dark"  — on dark backgrounds (lines: #E8EEF8, body: #0A1220 default)
 * variant="light" — on light backgrounds (lines: #0A1220, body: #0A1220)
 * variant="mono"  — single `color` prop for all strokes/fills
 */
export default function Logo({ size = 64, variant = 'dark', color }: LogoProps) {
  const lineColor = variant === 'mono' ? (color ?? '#4A9EFF') : variant === 'dark' ? '#E8EEF8' : '#0A1220';
  const bodyFill  = variant === 'mono' ? (color ?? '#4A9EFF') : '#0A1220';
  const bodyOnLight = variant === 'light' ? '#0A1220' : '#E8EEF8';

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Canopy fill */}
      <Path
        d="M6 28 C 8 18, 14 14, 22 14 L 42 14 C 50 14, 56 18, 58 28 L 50 26 L 42 28 L 32 26 L 22 28 L 14 26 Z"
        fill="#4A9EFF"
        stroke="#4A9EFF"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Cell lines */}
      <Line x1={14} y1={26} x2={16} y2={14} stroke={lineColor} strokeOpacity={0.35} strokeWidth={1.5} />
      <Line x1={22} y1={28} x2={24} y2={14} stroke={lineColor} strokeOpacity={0.35} strokeWidth={1.5} />
      <Line x1={32} y1={26} x2={32} y2={14} stroke={lineColor} strokeOpacity={0.35} strokeWidth={1.5} />
      <Line x1={42} y1={28} x2={40} y2={14} stroke={lineColor} strokeOpacity={0.35} strokeWidth={1.5} />
      <Line x1={50} y1={26} x2={48} y2={14} stroke={lineColor} strokeOpacity={0.35} strokeWidth={1.5} />
      {/* Line set to body */}
      <Path
        d="M10 28 L 32 50 L 54 28"
        stroke="#4A9EFF"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Body */}
      <Rect
        x={29} y={48} width={6} height={10} rx={3}
        fill={variant === 'light' ? '#0A1220' : variant === 'dark' ? '#E8EEF8' : (color ?? '#4A9EFF')}
      />
    </Svg>
  );
}
