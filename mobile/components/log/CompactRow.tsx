import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull } from '@/lib/types';
import { fmtAlt, fmtDate, type AltUnit, type DateFmt } from '@/lib/prefsContext';

interface Props {
  jump: JumpFull;
  onPress: () => void;
  altUnit?: AltUnit;
  dateFormat?: DateFmt;
}

export default function CompactRow({ jump, onPress, altUnit = 'ft', dateFormat = 'DD MMM YYYY' }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.number}>#{jump.jump_number}</Text>

      <View style={styles.middle}>
        <View style={styles.typeRow}>
          <Text style={styles.type}>{jump.jump_type ?? '—'}</Text>
          {jump.is_favourite && (
            <Ionicons name="star" size={11} color={colors.warn} style={styles.star} />
          )}
          {jump.is_draft && (
            <View style={styles.draftBadge}><Text style={styles.draftText}>DRAFT</Text></View>
          )}
          {((jump as any).aad_fired || (jump as any).reserve_deployed) && (
            <View style={styles.safetyBadge}><Text style={styles.safetyText}>⚠</Text></View>
          )}
        </View>
        <Text style={styles.sub} numberOfLines={1}>
          {jump.dropzones?.name ?? '—'}
          {jump.aircraft_type ? ` · ${jump.aircraft_type}` : ''}
        </Text>
      </View>

      <View style={styles.right}>
        {jump._synced === false && (
          <Ionicons name="cloud-upload-outline" size={12} color={colors.warn} style={{ marginBottom: 2 }} />
        )}
        <Text style={styles.alt}>{fmtAlt(jump.exit_altitude_ft, altUnit)}</Text>
        <Text style={styles.date}>{fmtDate(jump.date, dateFormat)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  number: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    color: colors.fg3,
    width: 44,
  },
  middle: {
    flex: 1,
    gap: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  type: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 15,
    color: colors.fg,
  },
  star: {
    marginTop: 1,
  },
  draftBadge: {
    backgroundColor: colors.warn + '33',
    borderWidth: 1,
    borderColor: colors.warn,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  draftText: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 8,
    color: colors.warn,
    letterSpacing: 0.3,
  },
  safetyBadge: {
    backgroundColor: colors.danger + '22',
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  safetyText: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 8,
    color: colors.danger,
  },
  sub: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: colors.fg2,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  alt: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 15,
    color: colors.fg,
  },
  date: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    color: colors.fg3,
  },
});
}
