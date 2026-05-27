import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { shadows } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

export type CardVariant = 'default' | 'elevated' | 'promo' | 'success' | 'warning' | 'danger';

interface CardProps {
  variant?: CardVariant;
  padding?: number;
  interactive?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: object;
}

export default function Card({
  variant = 'default',
  padding = 16,
  interactive = false,
  onPress,
  children,
  style,
}: CardProps) {
  const colors = useColors();
  const variantMap: Record<CardVariant, { bg: string; border: string; shadow: object }> = {
    default:  { bg: colors.surface,   border: colors.border,  shadow: {} },
    elevated: { bg: colors.surface,   border: colors.border,  shadow: shadows.card },
    promo:    { bg: colors.surface2,  border: colors.sky,     shadow: shadows.glow },
    success:  { bg: colors.okBg,      border: colors.ok,      shadow: {} },
    warning:  { bg: colors.warnBg,    border: colors.warn,    shadow: {} },
    danger:   { bg: colors.dangerBg,  border: colors.danger,  shadow: {} },
  };
  const v = variantMap[variant];
  const containerStyle = [
    styles.base,
    { backgroundColor: v.bg, borderColor: v.border, padding, ...v.shadow },
    style,
  ];

  if (interactive || onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={containerStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    borderWidth: 1,
  },
});
