import React from 'react';
import { View, Text, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { colors } from '@/constants/tokens';

type AvatarSize = 26 | 32 | 40 | 64 | 88;

interface AvatarProps {
  initials?: string;
  image?: ImageSourcePropType;
  size?: AvatarSize;
  color?: string;
}

export default function Avatar({
  initials,
  image,
  size = 40,
  color = colors.sky,
}: AvatarProps) {
  const fontSize = Math.round(size * 0.4);

  if (image) {
    return (
      <Image
        source={image}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
      ]}
    >
      <Text style={{ fontSize, fontWeight: '600', color: colors.onSky }}>
        {(initials ?? '?').slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
