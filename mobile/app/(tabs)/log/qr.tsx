import { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull } from '@/lib/types';

const EXPIRES_IN = 5 * 60; // 5 minutes

function fmtCountdown(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function QRScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { jumpId } = useLocalSearchParams<{ jumpId: string }>();
  const [jump, setJump] = useState<JumpFull | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRES_IN);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('jumps')
        .select('*, dropzones(name, region, latitude, longitude)')
        .eq('id', jumpId)
        .single();
      if (data) setJump(data as JumpFull);
    })();

    tickRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(tickRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);

    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [jumpId]);

  const expired = secondsLeft === 0;
  // QR payload: a deep link URL that opens the instructor-sign screen directly
  const token = Math.floor(Date.now() / (EXPIRES_IN * 1000));
  const qrValue = `mobile:///log/instructor-sign?jumpId=${jumpId}&t=${token}`;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.close} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hand to instructor</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.bodyText}>Ask your instructor to scan this code to sign your logbook entry.</Text>

        <View style={[styles.qrBox, expired && styles.qrBoxExpired]}>
          {expired ? (
            <View style={styles.expiredCenter}>
              <Ionicons name="refresh-circle-outline" size={48} color={colors.fg3} />
              <Text style={styles.expiredText}>Code expired</Text>
            </View>
          ) : (
            <QRCode value={qrValue} size={230} color={colors.bg} backgroundColor="#FFFFFF" />
          )}
        </View>

        <View style={styles.countdownRow}>
          <Ionicons name="time-outline" size={13} color={colors.fg3} />
          <Text style={[styles.countdown, expired && { color: colors.danger }]}>
            {expired ? 'EXPIRED' : `EXPIRES IN ${fmtCountdown(secondsLeft)}`}
          </Text>
        </View>

        {expired ? (
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => setSecondsLeft(EXPIRES_IN)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color={colors.onSky} />
            <Text style={styles.refreshBtnText}>Refresh code</Text>
          </TouchableOpacity>
        ) : null}

        {jump ? (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardMono}>JUMP #{jump.jump_number}</Text>
              <View style={styles.pendingBadge}><Text style={styles.pendingText}>PENDING</Text></View>
            </View>
            <Text style={styles.cardValue}>{jump.dropzones?.name ?? '—'}</Text>
            <View style={styles.divider} />
            <View style={styles.cardRow}>
              <View style={styles.cardCell}>
                <Text style={styles.cellLabel}>AIRCRAFT</Text>
                <Text style={styles.cellValue}>{jump.aircraft_type ?? '—'}{jump.aircraft_rego ? ' · ' + jump.aircraft_rego : ''}</Text>
              </View>
              <View style={styles.cardCell}>
                <Text style={styles.cellLabel}>EXIT</Text>
                <Text style={styles.cellValue}>{jump.exit_altitude_ft ? jump.exit_altitude_ft.toLocaleString() + ' ft' : '—'}</Text>
              </View>
              <View style={styles.cardCell}>
                <Text style={styles.cellLabel}>FF</Text>
                <Text style={styles.cellValue}>{jump.freefall_seconds ? jump.freefall_seconds + 's' : '—'}</Text>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  close: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: spacing[5], paddingTop: spacing[8] },
  bodyText: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2, textAlign: 'center', marginBottom: spacing[8] },
  qrBox: { width: 268, height: 268, borderRadius: radii.lg, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 19 },
  qrBoxExpired: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  expiredCenter: { alignItems: 'center', gap: spacing[2] },
  expiredText: { fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg3 },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: spacing[4] },
  countdown: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.8, color: c.fg3 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: c.sky, paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderRadius: radii.md, marginTop: spacing[5] },
  refreshBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 14, color: c.onSky },
  card: { width: '100%', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginTop: spacing[6] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
  cardMono: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.8, color: c.fg3 },
  pendingBadge: { backgroundColor: 'rgba(255,183,74,0.15)', paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radii.sm },
  pendingText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.warn, letterSpacing: 0.5 },
  cardValue: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing[3] },
  cardRow: { flexDirection: 'row' },
  cardCell: { flex: 1 },
  cellLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.fg3 },
  cellValue: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg, marginTop: 2 },
  });
}
