import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/constants/tokens';

interface ProgressProps {
  /** 0 – 1 */
  value: number;
  color?: string;
  height?: number;
}

export default function Progress({
  value,
  color = colors.ok,
  height = 6,
}: ProgressProps) {
  const pct = `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` as `${number}%`;

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View
        style={[
          styles.fill,
          { width: pct, backgroundColor: color, borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
