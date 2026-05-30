import React, { useMemo } from 'react';
import { TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';
import { shadows } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import Icon from './Icon';

interface IconButtonProps {
  name: string;
  onPress?: () => void;
  badge?: boolean;
  disabled?: boolean;
  color?: string;
  /** @deprecated use iconColor */
  iconColor?: string;
  style?: ViewStyle;
}

export default function IconButton({
  name,
  onPress,
  badge = false,
  disabled = false,
  color,
  iconColor,
  style,
}: IconButtonProps) {
  const colors = useColors();
  const resolvedColor = iconColor ?? color ?? colors.fg;
  const styles = useMemo(() => StyleSheet.create({
    base: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.card,
    },
    disabled: { opacity: 0.5 },
    badge: {
      position: 'absolute',
      top: 3,
      right: 3,
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.sky,
    },
  }), [colors]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.base, style, disabled && styles.disabled]}
    >
      <Icon name={name} size={18} color={resolvedColor} />
      {badge && <View style={styles.badge} />}
    </TouchableOpacity>
  );
}
