import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { JumpFull } from '@/lib/types';

interface Props {
  jump: JumpFull;
  onPress?: () => void;
}

export default function JumpCard({ jump, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.row}>
        <Text style={styles.number}>#{jump.jump_number}</Text>
        <View style={styles.body}>
          <Text style={styles.location}>{jump.dropzones?.name ?? '—'}</Text>
          <Text style={styles.meta}>
            {jump.aircraft_type ?? '—'} · {jump.exit_altitude_ft?.toLocaleString() ?? '—'} ft ·{' '}
            {jump.freefall_seconds ?? 0}s
          </Text>
        </View>
        <Text style={styles.date}>{jump.date.slice(0, 10)}</Text>
      </View>
      {jump.notes ? (
        <Text style={styles.description} numberOfLines={1}>
          {jump.notes}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: { fontSize: 12, color: '#9ca3af', width: 32 },
  body: { flex: 1 },
  location: { fontSize: 14, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  date: { fontSize: 12, color: '#9ca3af' },
  description: { marginTop: 6, fontSize: 12, color: '#6b7280' },
});
