import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import typography from '@/constants/typography';
import { useColors } from '@/lib/theme';
import Icon from './Icon';

export type BadgeKind = 'sky' | 'ok' | 'warn' | 'danger' | 'muted';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  kind?: BadgeKind;
  icon?: string;
  size?: BadgeSize;
  children: React.ReactNode;
}

export default function Badge({ kind = 'muted', icon, size = 'md', children }: BadgeProps) {
  const colors = useColors();
  const kindMap: Record<BadgeKind, { bg: string; text: string }> = {
    sky:    { bg: colors.skyBg,    text: colors.sky    },
    ok:     { bg: colors.okBg,     text: colors.ok     },
    warn:   { bg: colors.warnBg,   text: colors.warn   },
    danger: { bg: colors.dangerBg, text: colors.danger },
    muted:  { bg: colors.surface2, text: colors.fg2    },
  };
  const k = kindMap[kind];
  const height     = size === 'sm' ? 18 : 22;
  const paddingH   = size === 'sm' ? 6  : 8;

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: k.bg, height, paddingHorizontal: paddingH },
      ]}
    >
      {icon && (
        <View style={{ marginRight: 3 }}>
          <Icon name={icon} size={11} color={k.text} />
        </View>
      )}
      <Text style={[typography.badge, { color: k.text }]}>
        {typeof children === 'string' ? children.toUpperCase() : children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
});
