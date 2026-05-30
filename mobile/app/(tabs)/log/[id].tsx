import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useColors } from '@/lib/theme';
import typography from '@/constants/typography';
import { IconButton } from '@/components/ui';
import type { JumpFull, JumpSignature, TagData, JumpEdit } from '@/lib/types';
import DetailStandard from '@/components/log/DetailStandard';
import DetailCockpit  from '@/components/log/DetailCockpit';
import DetailPhotoLed from '@/components/log/DetailPhotoLed';

export type LayoutPref = 'Standard' | 'Cockpit' | 'Photo-led';

export interface JumpDetailProps {
  jump:       JumpFull;
  signatures: JumpSignature[];
  tags:       TagData[];
  edits:      JumpEdit[];
}

// ─── Top bar ─────────────────────────────────────────────────────────────────

interface TopBarProps {
  layout:            LayoutPref;
  title?:            string;
  isFavourite:       boolean;
  overlay?:          boolean;
  onBack:            () => void;
  onToggleFavourite: () => void;
  onMenu:            () => void;
  onShare:           () => void;
}

function TopBar({
  layout, title, isFavourite, overlay = false,
  onBack, onToggleFavourite, onMenu, onShare,
}: TopBarProps) {
  const colors = useColors();

  // Overlay buttons use a dark semi-transparent surface so they're visible over the photo
  const btnBg = overlay ? 'rgba(10,18,32,0.55)' : undefined;
  const btnBorder = overlay ? 'rgba(255,255,255,0.12)' : undefined;
  const iconColor = overlay ? '#fff' : colors.fg;

  const buttonStyle = overlay
    ? { backgroundColor: btnBg, borderColor: btnBorder }
    : undefined;

  return (
    <View style={styles.topBar}>
      <IconButton name="back" onPress={onBack} style={buttonStyle} iconColor={iconColor} />
      <View style={styles.topBarCenter}>
        {title ? (
          <Text
            style={[typography.md, { color: overlay ? '#fff' : colors.fg, fontWeight: '600' }]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
      </View>
      <View style={styles.topBarRight}>
        <IconButton
          name={isFavourite ? 'star-fill' : 'star'}
          onPress={onToggleFavourite}
          style={buttonStyle}
          iconColor={isFavourite ? colors.warn : iconColor}
        />
        <IconButton name="dots" onPress={onMenu} style={buttonStyle} iconColor={iconColor} />
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function JumpDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [jump,       setJump]       = useState<JumpFull | null>(null);
  const [signatures, setSignatures] = useState<JumpSignature[]>([]);
  const [tags,       setTags]       = useState<TagData[]>([]);
  const [layout,     setLayout]     = useState<LayoutPref>('Standard');
  const [edits,      setEdits]      = useState<JumpEdit[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const [jumpRes, userRes, sigsRes, tagsRes, editsRes] = await Promise.all([
      supabase
        .from('jumps')
        .select('*, dropzones(name, region, latitude, longitude)')
        .eq('id', id)
        .single(),
      supabase
        .from('users')
        .select('display_layout_jump_detail')
        .eq('id', user.id)
        .single(),
      supabase.from('signatures').select('*').eq('jump_id', id),
      supabase.from('jump_tags').select('tags(id, name, color)').eq('jump_id', id),
      supabase.from('jump_edits').select('*').eq('jump_id', id).order('edited_at', { ascending: true }),
    ]);

    if (jumpRes.data) setJump(jumpRes.data as JumpFull);
    if (userRes.data?.display_layout_jump_detail) {
      setLayout(userRes.data.display_layout_jump_detail as LayoutPref);
    }
    setSignatures((sigsRes.data ?? []) as JumpSignature[]);
    const flatTags = ((tagsRes.data ?? []) as unknown as Array<{ tags: TagData | null }>)
      .map(row => row.tags)
      .filter((t): t is TagData => t !== null);
    setTags(flatTags);
    setEdits((editsRes.data ?? []) as JumpEdit[]);
    setLoading(false);
  };

  const toggleFavourite = async () => {
    if (!jump) return;
    const next = !jump.is_favourite;
    setJump({ ...jump, is_favourite: next });
    await supabase.from('jumps').update({ is_favourite: next }).eq('id', jump.id);
  };

  const handleMenu = () => {
    const isSigned = signatures.length > 0;
    Alert.alert(`Jump #${jump?.jump_number}`, undefined, [
      { text: 'Edit jump', onPress: () => router.push({ pathname: '/(tabs)/log/edit', params: { id } }) },
      ...(!isSigned ? [
        { text: 'Get signed', onPress: () => router.push({ pathname: '/(tabs)/log/instructor-sign', params: { jumpId: id } }) },
        { text: 'Show QR for sign-off', onPress: () => router.push({ pathname: '/(tabs)/log/qr', params: { jumpId: id } }) },
      ] : []),
      { text: 'Delete jump', style: 'destructive' as const, onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleDelete = () => {
    if (!jump) return;
    Alert.alert(
      `Delete Jump #${jump.jump_number}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error, count } = await supabase
              .from('jumps')
              .delete({ count: 'exact' })
              .eq('id', jump.id);
            if (error || count === 0) {
              Alert.alert('Error', error?.message ?? 'Jump could not be deleted. Please try again.');
              return;
            }
            router.replace('/(tabs)/log');
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.sky} />
      </View>
    );
  }

  if (!jump) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={[typography.base, { color: colors.fg2 }]}>Jump not found.</Text>
      </View>
    );
  }

  const topBarTitle =
    layout === 'Cockpit'
      ? `#${jump.jump_number}${jump.jump_type ? ` · ${jump.jump_type}` : ''}`
      : layout === 'Photo-led'
      ? undefined
      : `Jump #${jump.jump_number}`;

  const detailProps: JumpDetailProps = { jump, signatures, tags, edits };

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      {layout !== 'Photo-led' && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
          <TopBar
            layout={layout}
            title={topBarTitle}
            isFavourite={jump.is_favourite}
            onBack={() => router.back()}
            onToggleFavourite={toggleFavourite}
            onMenu={handleMenu}
            onShare={() => {}}
          />
        </SafeAreaView>
      )}

      {layout === 'Standard'  && <DetailStandard  {...detailProps} />}
      {layout === 'Cockpit'   && <DetailCockpit   {...detailProps} />}
      {layout === 'Photo-led' && <DetailPhotoLed  {...detailProps} />}

      {layout === 'Photo-led' && (
        <SafeAreaView
          edges={['top']}
          style={styles.photoNavOverlay}
          pointerEvents="box-none"
        >
          <TopBar
            layout={layout}
            overlay
            title={undefined}
            isFavourite={jump.is_favourite}
            onBack={() => router.back()}
            onToggleFavourite={toggleFavourite}
            onMenu={handleMenu}
            onShare={() => {}}
          />
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 4,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 4,
  },
  photoNavOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
});
