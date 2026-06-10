import { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ScrollView, Animated, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const SORT_OPTIONS = [
  { key: 'date_desc', label: 'Date · newest' },
  { key: 'date_asc',  label: 'Date · oldest' },
  { key: 'jump_num',  label: 'Jump number' },
  { key: 'freefall',  label: 'Freefall time' },
] as const;

const JUMP_TYPES = ['Belly', 'Tracking', 'Wingsuit', 'Freefly', 'CRW', 'AFF', 'Tandem', 'Coach', 'Demo', 'Night', 'Camera Flying', 'Hop&Pop'];

export type SortKey = typeof SORT_OPTIONS[number]['key'];

export interface FilterState {
  sort: SortKey;
  jumpTypes: string[];
  favouritesOnly: boolean;
  signedOnly: boolean;
}

export const DEFAULT_FILTER: FilterState = {
  sort: 'date_desc',
  jumpTypes: [],
  favouritesOnly: false,
  signedOnly: false,
};

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filter: FilterState;
  onApply: (f: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[{ paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.pill, borderWidth: 1, borderColor: active ? colors.sky : colors.border, backgroundColor: active ? colors.sky : colors.surface2 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={{ fontFamily: 'InterTight-Medium', fontSize: 13, color: active ? colors.onSky : colors.fg2 }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function FilterSheet({ visible, onClose, filter, onApply, totalCount, filteredCount }: FilterSheetProps) {
  const [local, setLocal] = useState<FilterState>(filter);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const reset = () => setLocal(DEFAULT_FILTER);

  const toggleType = (t: string) => {
    setLocal(f => ({
      ...f,
      jumpTypes: f.jumpTypes.includes(t) ? f.jumpTypes.filter(x => x !== t) : [...f.jumpTypes, t],
    }));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filter &amp; sort</Text>
          <TouchableOpacity onPress={reset} activeOpacity={0.7}>
            <Text style={styles.reset}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Sort by */}
          <Text style={styles.sectionLabel}>SORT BY</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map(o => (
              <Chip key={o.key} label={o.label} active={local.sort === o.key} onPress={() => setLocal(f => ({ ...f, sort: o.key }))} />
            ))}
          </View>

          {/* Jump type */}
          <Text style={styles.sectionLabel}>JUMP TYPE</Text>
          <View style={styles.chipRow}>
            {JUMP_TYPES.map(t => (
              <Chip key={t} label={t} active={local.jumpTypes.includes(t)} onPress={() => toggleType(t)} />
            ))}
          </View>

          {/* Other filters */}
          <Text style={styles.sectionLabel}>OTHER</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Favourites only</Text>
            <TouchableOpacity
              style={[styles.toggle, local.favouritesOnly && styles.toggleOn]}
              onPress={() => setLocal(f => ({ ...f, favouritesOnly: !f.favouritesOnly }))}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, local.favouritesOnly && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
          <View style={[styles.toggleRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Text style={styles.toggleLabel}>Signed only</Text>
            <TouchableOpacity
              style={[styles.toggle, local.signedOnly && styles.toggleOn]}
              onPress={() => setLocal(f => ({ ...f, signedOnly: !f.signedOnly }))}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, local.signedOnly && styles.toggleThumbOn]} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Apply button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => { onApply(local); onClose(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={16} color={colors.onSky} />
            <Text style={styles.applyBtnText}>Apply · {filteredCount} jumps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 40, maxHeight: '80%' },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing[2.5], marginBottom: spacing[2] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg },
  reset: { fontFamily: 'InterTight-Medium', fontSize: 14, color: colors.sky },
  scroll: { flexShrink: 1 },
  scrollContent: { padding: spacing[5], paddingBottom: spacing[2] },
  sectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[2], marginTop: spacing[4] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.pill, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.sky, borderColor: colors.sky },
  chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: colors.fg2 },
  chipTextActive: { color: colors.onSky },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing[3.5] },
  toggleLabel: { fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg },
  toggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: colors.surface2, justifyContent: 'center', paddingHorizontal: 2 },
  toggleOn: { backgroundColor: colors.sky },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.fg3 },
  toggleThumbOn: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  footer: { paddingHorizontal: spacing[5], paddingTop: spacing[3] },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: colors.sky, borderRadius: radii.md, paddingVertical: spacing[4] },
  applyBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: colors.onSky },
});
}
