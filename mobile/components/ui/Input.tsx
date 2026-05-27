import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import typography from '@/constants/typography';
import { useColors } from '@/lib/theme';
import Icon from './Icon';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  icon?: string;
  helper?: string;
  state?: 'default' | 'error' | 'disabled';
}

export default function Input({
  label,
  icon,
  helper,
  state = 'default',
  ...props
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const styles = useMemo(() => StyleSheet.create({
    label:   { color: colors.fg2, marginBottom: 6 },
    wrap:    { height: 52, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
    iconWrap: { position: 'absolute', left: 14, zIndex: 1 },
    input:   { flex: 1, paddingRight: 14, height: '100%' },
    helper:  { marginTop: 4, marginLeft: 2 },
  }), [colors]);

  const borderColor =
    state === 'error'   ? colors.danger
    : focused           ? colors.sky
    : colors.border;

  const helperColor = state === 'error' ? colors.danger : colors.fg3;

  return (
    <View style={{ opacity: state === 'disabled' ? 0.5 : 1 }}>
      {label && (
        <Text style={[typography.inputLabel, styles.label]}>
          {label.toUpperCase()}
        </Text>
      )}
      <View style={[styles.wrap, { borderColor }]}>
        {icon && (
          <View style={styles.iconWrap}>
            <Icon name={icon} size={18} color={colors.fg3} />
          </View>
        )}
        <TextInput
          {...props}
          editable={state !== 'disabled'}
          onFocus={(e) => { setFocused(true);  props.onFocus?.(e); }}
          onBlur={(e)  => { setFocused(false); props.onBlur?.(e);  }}
          placeholderTextColor={colors.fg3}
          style={[
            typography.input,
            styles.input,
            { color: colors.fg, paddingLeft: icon ? 40 : 14 },
          ]}
        />
      </View>
      {helper && (
        <Text style={[typography.xs, styles.helper, { color: helperColor }]}>
          {helper}
        </Text>
      )}
    </View>
  );
}

