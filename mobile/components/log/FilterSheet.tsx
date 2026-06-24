import { useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  ScrollView, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull, TagData } from '@/lib/types';
import { JUMP_TYPES } from '@/lib/jumpTypes';
import { CollapsibleChipRow } from '@/components/log/CollapsibleChipRow';

const SORT_OPTIONS = [
  { key: 'date_desc', label: 'Newest first' },
  { key: 'date_asc',  label: 'Oldest first' },
  { key: 'jump_num',  label: 'Jump number' },
  { key: 'freefall',  label: 'Freefall time' },
] as const;

export type SortKey = typeof SORT_OPTIONS[number]['key'];

export interface FilterState {
  sort: SortKey;
  jumpTypes: string[];
  tags: string[];
  favouritesOnly: boolean;
  signedOnly: boolean;
}

export const DEFAULT_FILTER: FilterState = {
  sort: 'date_desc',
  jumpTypes: [],
  tags: [],
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
  allJumps?: JumpFull[];
  userTags?: TagData[];
}

function Chip({ label, active, color, onPress }: { label: string; active: boolean; color?: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[{
        paddingHorizontal: spacing[3], paddingVertical: spacing[1.5],
        borderRadius: radii.pill, borderWidth: 1,
        borderColor: active ? (color ?? colors.sky) : colors.border,
        backgroundColor: active ? (color ?? colors.sky) : colors.surface2,
        flexDirection: 'row', alignItems: 'center', gap: 5,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {color && !active && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />}
      <Text style={{ fontFamily: 'InterTight-Medium', fontSize: 13, color: active ? colors.onSky : colors.fg2 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function FilterSheet({ visible, onClose, filter, onApply, totalCount, filteredCount, allJumps, userTags = [] }: FilterSheetProps) {
  const [local, setLocal] = useState<FilterState>(filter);
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Sync local state when filter prop changes (e.g. external reset)
  const prevVisible = useMemo(() => visible, [visible]);
  if (visible && !prevVisible) {
    // Can't call setLocal here; handled via key reset below
  }

  const previewCount = useMemo(() => {
    if (!allJumps) return filteredCount;
    let list = allJumps;
    if (local.jumpTypes.length > 0) {
      list = list.filter(j => local.jumpTypes.includes(j.jump_type ?? ''));
    }
    if (local.tags.length > 0) {
      list = list.filter(j => j.tags?.some(t => local.tags.includes(t.id)) ?? false);
    }
    if (local.favouritesOnly) list = list.filter(j => j.is_favourite);
    if (local.signedOnly) list = list.filter(j => (j.signatures?.length ?? 0) > 0);
    return list.length;
  }, [local, allJumps, filteredCount]);

  const reset = () => setLocal(DEFAULT_FILTER);
  const toggleType = (t: string) => setLocal(f => ({
    ...f,
    jumpTypes: f.jumpTypes.includes(t) ? f.jumpTypes.filter(x => x !== t) : [...f.jumpTypes, t],
  }));
  const toggleTag = (id: string) => setLocal(f => ({
    ...f,
    tags: f.tags.includes(id) ? f.tags.filter(x => x !== id) : [...f.tags, id],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => setLocal(filter)}
    >
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.title}>Filter &amp; sort</Text>
          <TouchableOpacity onPress={reset} activeOpacity={0.7}>
            <Text style={styles.reset}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Sort */}
          <Text style={styles.sectionLabel}>SORT BY</Text>
          <View style={styles.chipRow}>
            {SORT_OPTIONS.map(o => (
              <Chip key={o.key} label={o.label} active={local.sort === o.key} onPress={() => setLocal(f => ({ ...f, sort: o.key }))} />
            ))}
          </View>

          {/* Jump type — collapsible */}
          <Text style={styles.sectionLabel}>JUMP TYPE</Text>
          <CollapsibleChipRow
            items={[...JUMP_TYPES]}
            style={{ marginBottom: spacing[2] }}
            renderChip={(t) => (
              <Chip label={t} active={local.jumpTypes.includes(t)} onPress={() => toggleType(t)} />
            )}
          />

          {/* Tags — only shown when user has tags */}
          {userTags.length > 0 && (<>
            <Text style={styles.sectionLabel}>TAGS</Text>
            <View style={styles.chipRow}>
              {userTags.map(tag => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  active={local.tags.includes(tag.id)}
                  color={tag.color}
                  onPress={() => toggleTag(tag.id)}
                />
              ))}
            </View>
          </>)}

          {/* Other */}
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyBtn}
            onPress={() => { onApply(local); onClose(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark" size={16} color={colors.onSky} />
            <Text style={styles.applyBtnText}>Apply · {previewCount} jumps</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 40, maxHeight: '85%' },
    handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing[2.5], marginBottom: spacing[2] },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg },
    reset: { fontFamily: 'InterTight-Medium', fontSize: 14, color: colors.sky },
    scroll: { flexShrink: 1 },
    scrollContent: { padding: spacing[5], paddingBottom: spacing[2] },
    sectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[2], marginTop: spacing[4] },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
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
