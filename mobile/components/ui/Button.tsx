import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '@/constants/tokens';
import typography from '@/constants/typography';
import Icon from './Icon';

export type ButtonVariant = 'primary' | 'ghost' | 'sub' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'leading' | 'trailing';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

const variantMap = {
  primary: { bg: colors.sky,      text: colors.onSky, borderColor: 'transparent', borderWidth: 0 },
  ghost:   { bg: 'transparent',   text: colors.fg,    borderColor: colors.borderStrong, borderWidth: 1 },
  sub:     { bg: colors.surface,  text: colors.fg,    borderColor: colors.border, borderWidth: 1 },
  danger:  { bg: colors.danger,   text: colors.onSky, borderColor: 'transparent', borderWidth: 0 },
};

const heights:   Record<ButtonSize, number> = { sm: 32, md: 38, lg: 52 };
const paddingH:  Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'leading',
  fullWidth = true,
  disabled = false,
  loading = false,
  onPress,
  children,
  style,
}: ButtonProps) {
  const v = variantMap[variant];
  const textStyle = size === 'sm' ? typography.buttonSm : typography.button;
  const iconSize  = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        {
          height:           heights[size],
          paddingHorizontal: paddingH[size],
          backgroundColor:  v.bg,
          borderColor:      v.borderColor,
          borderWidth:      v.borderWidth,
          alignSelf:        fullWidth ? 'stretch' : 'flex-start',
          opacity:          disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.inner}>
          {icon && iconPosition === 'leading' && (
            <View style={styles.iconLeading}>
              <Icon name={icon} size={iconSize} color={v.text} />
            </View>
          )}
          <Text style={[textStyle, { color: v.text }]}>{children}</Text>
          {icon && iconPosition === 'trailing' && (
            <View style={styles.iconTrailing}>
              <Icon name={icon} size={iconSize} color={v.text} />
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconLeading:  { marginRight: 6 },
  iconTrailing: { marginLeft: 6 },
});
