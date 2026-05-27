import React, { useMemo, useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import typography from '@/constants/typography';
import { useColors } from '@/lib/theme';
import Icon from './Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
}: SearchBarProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => StyleSheet.create({
    wrap: {
      height: 40,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      gap: 8,
    },
    focused: { borderColor: colors.sky },
    input: { flex: 1, height: '100%' },
  }), [colors]);

  return (
    <View style={[styles.wrap, focused && styles.focused]}>
      <Icon name="search" size={16} color={colors.fg3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.fg3}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[typography.base, styles.input, { color: colors.fg }]}
      />
    </View>
  );
}
