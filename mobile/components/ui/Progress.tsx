import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '@/lib/theme';

interface ProgressProps {
  /** 0 – 1 */
  value: number;
  color?: string;
  height?: number;
}

export default function Progress({
  value,
  color,
  height = 6,
}: ProgressProps) {
  const colors = useColors();
  const resolvedColor = color ?? colors.ok;
  const pct = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` as `${number}%`;
  const styles = useMemo(() => StyleSheet.create({
    track: { backgroundColor: colors.surface2, overflow: 'hidden' },
    fill:  { height: '100%' },
  }), [colors]);

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: pct, backgroundColor: resolvedColor, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}
