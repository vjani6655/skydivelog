import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/tokens';
import typography from '@/constants/typography';

interface ChipProps {
  active?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  children: React.ReactNode;
}

export default function Chip({
  active = false,
  leading,
  trailing,
  onPress,
  children,
}: ChipProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.base,
        active
          ? { backgroundColor: colors.skyBg,   borderColor: colors.sky }
          : { backgroundColor: colors.surface,  borderColor: colors.border },
      ]}
    >
      {leading && <View style={styles.leading}>{leading}</View>}
      <Text style={[typography.chip, { color: active ? colors.sky : colors.fg2 }]}>
        {children}
      </Text>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  leading:  { marginRight: 5 },
  trailing: { marginLeft: 5 },
});
