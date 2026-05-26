import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '@/constants/tokens';
import typography from '@/constants/typography';

interface StatBigProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}

export default function StatBig({ label, value, unit, sub }: StatBigProps) {
  return (
    <View>
      <Text style={[typography.overline, { color: colors.fg3, marginBottom: 4 }]}>
        {label.toUpperCase()}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <Text style={[typography.numLg, { color: colors.fg }]}>{value}</Text>
        {unit && (
          <Text style={[typography.sm, { color: colors.fg3, marginBottom: 4 }]}>
            {unit}
          </Text>
        )}
      </View>
      {sub && (
        <Text style={[typography.xs, { color: colors.fg3, marginTop: 2 }]}>{sub}</Text>
      )}
    </View>
  );
}
