import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import typography from '@/constants/typography';
import { useColors } from '@/lib/theme';

interface FieldProps {
  label: string;
  value: string | React.ReactNode;
  mono?: boolean;
  sub?: string;
  action?: React.ReactNode;
}

export default function Field({ label, value, mono = false, sub, action }: FieldProps) {
  const colors = useColors();
  const styles = useMemo(() => StyleSheet.create({
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
  }), [colors]);

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

