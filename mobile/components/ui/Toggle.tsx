import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { colors, durations } from '@/constants/tokens';

interface ToggleProps {
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function Toggle({ on, onChange, disabled = false }: ToggleProps) {
  const translateX = useRef(new Animated.Value(on ? 18 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: on ? 18 : 0,
      duration: durations.fast,
      useNativeDriver: true,
    }).start();
  }, [on, translateX]);

  return (
    <TouchableOpacity
      onPress={() => !disabled && onChange(!on)}
      activeOpacity={0.8}
      style={[
        styles.track,
        { backgroundColor: on ? colors.sky : colors.surface3 },
        disabled && styles.disabled,
      ]}
    >
      <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
  },
  disabled: {
    opacity: 0.5,
  },
});
