import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import typography from '@/constants/typography';
import Icon from './Icon';

interface TagProps {
  color: string;
  removable?: boolean;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  children: React.ReactNode;
}

/** Append an 8-bit alpha hex suffix to a 6-char hex color. */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + a;
}

export default function Tag({
  color,
  removable = false,
  size = 'md',
  onRemove,
  children,
}: TagProps) {
  const dotSize = size === 'sm' ? 4 : 5;
  const paddingV = size === 'sm' ? 3 : 4;

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: withAlpha(color, 0.1),
          borderColor:     withAlpha(color, 0.2),
          paddingVertical: paddingV,
        },
      ]}
    >
      <View style={[styles.dot, { width: dotSize, height: dotSize, backgroundColor: color }]} />
      <Text style={[typography.xs, { color, marginLeft: 5 }]}>{children}</Text>
      {removable && (
        <TouchableOpacity onPress={onRemove} style={{ marginLeft: 5 }}>
          <Icon name="close" size={11} color={color} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: 999,
  },
});
