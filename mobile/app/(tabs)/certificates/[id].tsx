import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet,  ActivityIndicator,
  TouchableOpacity, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { Certificate, EditLogEntry } from '@/lib/types';

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

const CATEGORY_LABEL: Record<string, string> = {
  licence: 'Licence',
  rating: 'Rating',
  medical: 'Medical',
  other: 'Other',
};

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CertificateDetailScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<EditLogEntry[]>([]);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const [{ data: certData }, { data: logData }] = await Promise.all([
      supabase.from('certificates').select('*').eq('id', id).single(),
      supabase.from('edit_log').select('*').eq('item_id', id).eq('item_type', 'certificate').order('changed_at', { ascending: false }),
    ]);
    setCert(certData as Certificate | null);
    setLog((logData ?? []) as EditLogEntry[]);
    // Generate signed URL for photo
    const fileUrl = (certData as Certificate | null)?.document_file_url ?? null;
    if (fileUrl) {
      const path = fileUrl.includes('/certificates/')
        ? fileUrl.split('/certificates/').pop() ?? null
        : null;
      if (path) {
        const { data: signed } = await supabase.storage.from('certificates').createSignedUrl(decodeURIComponent(path), 3600);
        setPhotoSignedUrl(signed?.signedUrl ?? fileUrl);
      } else {
        setPhotoSignedUrl(fileUrl);
      }
    } else {
      setPhotoSignedUrl(null);
    }
    setLoading(false);
  }, [id]);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  const handleDelete = () =>
    Alert.alert('Delete certificate?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('certificates').delete().eq('id', id);
          router.back();
        },
      },
    ]);

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;
  if (!cert) return <View style={[styles.center, { backgroundColor: colors.bg }]}><Text style={{ color: colors.fg2 }}>Not found.</Text></View>;

  const hasExpiry = !!cert.expires_date;
  const days = hasExpiry ? daysUntil(cert.expires_date!) : null;
  const isWarn = days !== null && days <= 30 && days >= 0;
  const isDanger = days !== null && days < 0;

  const statusColor = isDanger ? colors.danger : isWarn ? colors.warn : colors.ok;
  const statusBg = isDanger ? 'rgba(255,107,107,0.12)' : isWarn ? 'rgba(255,183,74,0.12)' : colors.okBg;
  const statusLabel = hasExpiry && days !== null
    ? isDanger ? `${-days}D OVERDUE` : `${days}D LEFT`
    : 'NO EXPIRY';

  const specs: [string, string][] = [
    ['Category', CATEGORY_LABEL[cert.category] ?? cert.category],
    ['Issuing body', cert.issuing_body ?? '—'],
    ['Issued', fmtDate(cert.issued_date)],
    ['Expires', hasExpiry ? fmtDate(cert.expires_date!) : 'No expiry'],
    ...(cert.reference_number ? [['Reference number', cert.reference_number] as [string, string]] : []),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{cert.title}</Text>
        <TouchableOpacity style={styles.editBtn} onPress={() => router.push({ pathname: '/(tabs)/certificates/edit', params: { id } })} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={16} color={colors.fg2} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Hero row */}
        <View style={styles.heroRow}>
          <View style={[styles.certIcon, { backgroundColor: statusBg }]}>
            <Ionicons name="ribbon-outline" size={30} color={statusColor} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing[4] }}>
            <Text style={styles.certName}>{cert.title}</Text>
            <Text style={styles.certCategory}>{(CATEGORY_LABEL[cert.category] ?? cert.category).toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>

        {/* Specs */}
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.card}>
          {specs.map(([label, value], i) => (
            <View key={label} style={[styles.specRow, i < specs.length - 1 && styles.specRowBorder]}>
              <Text style={styles.specLabel}>{label}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Photo */}
        {cert.document_file_url && photoSignedUrl ? (
          <>
            <Text style={styles.sectionTitle}>Photo</Text>
            <Image source={{ uri: photoSignedUrl }} style={styles.photo} resizeMode="cover" />
          </>
        ) : null}

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Text style={styles.deleteBtnText}>Delete certificate</Text>
        </TouchableOpacity>

        {/* Edit history */}
        {log.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Edit history</Text>
            <View style={styles.card}>
              {log.map((entry, ei) => (
                <View key={entry.id} style={[styles.logEntry, ei < log.length - 1 && styles.specRowBorder]}>
                  <Text style={styles.logDate}>{fmtDateTime(entry.changed_at)}</Text>
                  {entry.changes.map((ch, ci) => (
                    <View key={ci} style={styles.logChange}>
                      <Text style={styles.logField}>{ch.field}</Text>
                      <View style={styles.logValues}>
                        <Text style={styles.logFrom}>{ch.from ?? '—'}</Text>
                        <Ionicons name="arrow-forward" size={11} color={colors.fg3} style={{ marginHorizontal: 4 }} />
                        <Text style={styles.logTo}>{ch.to ?? '—'}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    back: { width: 36, height: 36, justifyContent: 'center' },
    editBtn: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, paddingHorizontal: spacing[2] },
    body: { padding: spacing[5], paddingBottom: spacing[12] },
    heroRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[5] },
    certIcon: { width: 60, height: 60, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    certName: { fontFamily: 'InterTight-SemiBold', fontSize: 18, color: c.fg },
    certCategory: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginTop: 3 },
    statusBadge: { alignSelf: 'flex-start', marginTop: spacing[2], paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.sm },
    statusBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.5 },
    sectionTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg3, letterSpacing: 0.3, marginBottom: spacing[2] },
    card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, marginBottom: spacing[5], overflow: 'hidden' },
    specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3.5] },
    specRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
    specLabel: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2 },
    specValue: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg, flexShrink: 1, textAlign: 'right', marginLeft: spacing[3], textTransform: 'capitalize' },
    docBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[5] },
    docBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.sky },
    photo: { width: '100%', height: 200, borderRadius: radii.md, marginBottom: spacing[5] },
    deleteBtn: { paddingVertical: spacing[4] },
    deleteBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.danger },
    logEntry: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
    logDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.fg3, letterSpacing: 0.3, marginBottom: spacing[2] },
    logChange: { marginBottom: spacing[1.5] },
    logField: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2, marginBottom: 2 },
    logValues: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    logFrom: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.danger, textDecorationLine: 'line-through' },
    logTo: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.ok },
  });
}
