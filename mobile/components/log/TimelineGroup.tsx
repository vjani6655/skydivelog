import { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull } from '@/lib/types';
import { usePrefs, fmtAlt, type AltUnit } from '@/lib/prefsContext';

function buildSub(jump: JumpFull, altUnit: AltUnit): string {
  const parts: string[] = [];
  if (jump.dropzones?.name) parts.push(jump.dropzones.name);
  if (jump.aircraft_type) parts.push(jump.aircraft_type);
  const alt = fmtAlt(jump.exit_altitude_ft, altUnit);
  if (alt && alt !== '—') parts.push(alt);
  return parts.join(' · ');
}

interface Props {
  month: string;     // e.g. "MAY 2026"
  count: number;
  jumps: JumpFull[];
  onPressJump: (id: string) => void;
}

export default function TimelineGroup({ month, count, jumps, onPressJump }: Props) {
  const { prefs } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.group}>
      {/* Month header */}
      <View style={styles.monthRow}>
        <Text style={styles.monthLabel}>{month}</Text>
        <Text style={styles.monthCount}>{count} JUMP{count !== 1 ? 'S' : ''}</Text>
      </View>

      {/* Jump rows */}
      {jumps.map((jump, index) => (
        <TouchableOpacity
          key={jump.id}
          style={[styles.jumpRow, index === jumps.length - 1 && styles.jumpRowLast]}
          onPress={() => onPressJump(jump.id)}
          activeOpacity={0.7}
        >
          {/* Timeline dot + vertical line */}
          <View style={styles.dotCol}>
            <View style={styles.dot} />
            {index < jumps.length - 1 && <View style={styles.line} />}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text style={styles.jumpType}>{jump.jump_type ?? '—'}</Text>              {jump._synced === false && (
                <Ionicons name="cloud-upload-outline" size={12} color={colors.warn} />
              )}              {jump.is_draft && (
                <View style={styles.draftBadge}><Text style={styles.draftText}>DRAFT</Text></View>
              )}
              <Text style={styles.jumpNumber}>#{jump.jump_number}</Text>
            </View>
            <Text style={styles.sub} numberOfLines={1}>{buildSub(jump, prefs.altUnit)}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
  group: {
    paddingHorizontal: spacing[5],
    marginBottom: spacing[5],
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[3],
    marginBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  monthLabel: {
    fontFamily: 'JetBrainsMono-SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    color: colors.fg,
  },
  monthCount: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.fg3,
  },
  jumpRow: {
    flexDirection: 'row',
    paddingVertical: spacing[2],
  },
  jumpRowLast: {
    paddingBottom: 0,
  },
  dotCol: {
    width: 20,
    alignItems: 'center',
    paddingTop: 5,
    marginRight: spacing[3],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sky,
  },
  line: {
    flex: 1,
    width: 1,
    backgroundColor: colors.border,
    marginTop: 3,
  },
  content: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing[3],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jumpType: {
    fontFamily: 'InterTight-SemiBold',
    fontSize: 15,
    color: colors.fg,
  },
  jumpNumber: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 11,
    color: colors.fg3,
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
  sub: {
    fontFamily: 'InterTight-Regular',
    fontSize: 12,
    color: colors.fg2,
  },
});
}
