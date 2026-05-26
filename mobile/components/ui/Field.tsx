import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/tokens';
import typography from '@/constants/typography';

interface FieldProps {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
  sub?: string;
  action?: React.ReactNode;
}

export default function Field({ label, value, mono = false, sub, action }: FieldProps) {
  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <Text style={[typography.overline, { color: colors.fg3 }]}>
          {label.toUpperCase()}
        </Text>
        <Text
          style={[
            mono ? typography.num : typography.base,
            { color: colors.fg, marginTop: 2 },
          ]}
        >
          {value}
        </Text>
        {sub && (
          <Text style={[typography.xs, { color: colors.fg3, marginTop: 2 }]}>
            {sub}
          </Text>
        )}
      </View>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: { flex: 1 },
  action:  { marginLeft: 12 },
});
