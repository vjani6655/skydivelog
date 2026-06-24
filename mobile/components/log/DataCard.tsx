import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull } from '@/lib/types';
import { fmtAltFull, fmtDate, type AltUnit, type DateFmt } from '@/lib/prefsContext';

function fmtFF(s: number | null): string {
  if (!s) return '—';
  return `${s} s`;
}

interface Props {
  jump: JumpFull;
  onPress: () => void;
  altUnit?: AltUnit;
  dateFormat?: DateFmt;
}

export default function DataCard({ jump, onPress, altUnit = 'ft', dateFormat = 'DD MMM YYYY' }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Overline */}
      <View style={styles.header}>
        <Text style={styles.overline}>JUMP #{jump.jump_number}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {jump._synced === false && (
            <Ionicons name="cloud-upload-outline" size={14} color={colors.warn} />
          )}
          {jump.is_draft && (
            <View style={styles.draftBadge}><Text style={styles.draftText}>DRAFT</Text></View>
          )}
          {((jump as any).aad_fired || (jump as any).reserve_deployed) && (
            <View style={styles.safetyBadge}><Text style={styles.safetyText}>⚠</Text></View>
          )}
          {jump.is_favourite && (
            <Ionicons name="star" size={12} color={colors.warn} />
          )}
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={1}>
        {jump.jump_type ?? '—'}
        {jump.dropzones?.name ? ` · ${jump.dropzones.name}` : ''}
      </Text>

      {/* 3-column stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>EXIT</Text>
          <Text style={styles.statValue}>{fmtAltFull(jump.exit_altitude_ft, altUnit)}</Text>
        </View>
        <View style={[styles.stat, styles.statMid]}>
          <Text style={styles.statLabel}>FF</Text>
          <Text style={styles.statValue}>{fmtFF(jump.freefall_seconds)}</Text>
        </View>
        <View style={[styles.stat, styles.statRight]}>
          <Text style={styles.statLabel}>DATE</Text>
          <Text style={styles.statValue}>{fmtDate(jump.date, dateFormat)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing[5],
    marginBottom: spacing[3],
    padding: spacing[4],
    gap: spacing[2],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  overline: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.fg3,
  },
  title: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 16,
    color: colors.fg,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing[1],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    flex: 1,
    gap: 3,
  },
  statMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
  },
  statRight: {
    paddingLeft: spacing[3],
  },
  statLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.fg3,
  },
  statValue: {
    fontFamily: 'InterTight-Medium',
    fontSize: 13,
    color: colors.fg,
  },
});
}
