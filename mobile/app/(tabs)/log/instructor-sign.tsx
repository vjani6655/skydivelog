import { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { PanResponder } from 'react-native';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull, JumpEdit } from '@/lib/types';

const CANVAS_W = 320;
const CANVAS_H = 200;

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function fmtSecs(s: number | null | undefined): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${s}s`;
}
function fmtAlt(ft: number | null | undefined): string {
  if (!ft) return '—';
  return ft.toLocaleString() + ' ft';
}

function Label({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

interface SigPadProps {
  onChange: (paths: string[]) => void;
  onDrawing?: (active: boolean) => void;
}

function SignaturePad({ onChange, onDrawing }: SigPadProps) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const allPaths = useRef<string[]>([]);
  const currentPath = useRef('');
  const [tick, setTick] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);
  const inlineLayout = useRef({ width: CANVAS_W, height: CANVAS_H });
  const fsLayout = useRef({ width: 600, height: 300 });

  function makePan(getLayout: () => { width: number; height: number }) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        onDrawing?.(true);
        const l = getLayout();
        const nx = (e.nativeEvent.locationX / l.width) * CANVAS_W;
        const ny = (e.nativeEvent.locationY / l.height) * CANVAS_H;
        currentPath.current = `M ${nx.toFixed(1)} ${ny.toFixed(1)}`;
        setTick(t => t + 1);
      },
      onPanResponderMove: (e) => {
        const l = getLayout();
        const nx = (e.nativeEvent.locationX / l.width) * CANVAS_W;
        const ny = (e.nativeEvent.locationY / l.height) * CANVAS_H;
        currentPath.current += ` L ${nx.toFixed(1)} ${ny.toFixed(1)}`;
        setTick(t => t + 1);
      },
      onPanResponderRelease: () => {
        onDrawing?.(false);
        if (currentPath.current) {
          allPaths.current = [...allPaths.current, currentPath.current];
          onChange([...allPaths.current]);
          currentPath.current = '';
          setTick(t => t + 1);
        }
      },
    });
  }

  const inlinePan = useRef(makePan(() => inlineLayout.current)).current;
  const fsPan = useRef(makePan(() => fsLayout.current)).current;

  const clear = () => { allPaths.current = []; currentPath.current = ''; onChange([]); setTick(t => t + 1); };

  const isEmpty = allPaths.current.length === 0 && !currentPath.current;

  const SigPaths = () => (
    <>
      {allPaths.current.map((d, i) => (
        <Path key={i} d={d} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {currentPath.current ? <Path d={currentPath.current} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </>
  );

  return (
    <>
      <View style={styles.sigPad}>
        <View style={styles.sigCanvas} {...inlinePan.panHandlers} onLayout={e => { inlineLayout.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }; }}>
          <Svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={StyleSheet.absoluteFill}>
            <SigPaths />
          </Svg>
          {isEmpty && <View style={styles.sigPlaceholder} pointerEvents="none"><Text style={styles.sigPlaceholderText}>Sign here</Text></View>}
        </View>
        <View style={styles.sigFooter}>
          <Text style={styles.sigHint}>INSTRUCTOR SIGNATURE</Text>
          <View style={styles.sigActions}>
            <TouchableOpacity onPress={() => setFullScreen(true)} style={styles.sigActionBtn}><Ionicons name="expand-outline" size={16} color={colors.fg2} /><Text style={styles.sigClear}>Full screen</Text></TouchableOpacity>
            <TouchableOpacity onPress={clear} style={styles.sigActionBtn}><Text style={styles.sigClear}>Clear</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      <Modal visible={fullScreen} animationType="slide" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setFullScreen(false)}>
        <SafeAreaView style={styles.fsScreen}>
          <View style={styles.fsCanvas} {...fsPan.panHandlers} onLayout={e => { fsLayout.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height }; }}>
            <Svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={StyleSheet.absoluteFill}>
              <SigPaths />
            </Svg>
            {isEmpty && <View style={styles.sigPlaceholder} pointerEvents="none"><Text style={styles.sigPlaceholderText}>Sign here</Text></View>}
          </View>
          <View style={styles.fsFooter}>
            <TouchableOpacity style={[styles.fsBtn, styles.fsBtnGhost]} onPress={clear}><Text style={styles.fsBtnGhostText}>Clear</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.fsBtn, styles.fsBtnPrimary]} onPress={() => setFullScreen(false)}><Ionicons name="checkmark" size={18} color={colors.onSky} /><Text style={styles.fsBtnPrimaryText}>Done</Text></TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// Time token — must match the formula in qr.tsx
const EXPIRES_IN = 5 * 60;
function currentToken() { return Math.floor(Date.now() / (EXPIRES_IN * 1000)); }

export default function InstructorSignScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { jumpId, changes: changesParam, t: tParam } = useLocalSearchParams<{ jumpId: string; changes?: string; t?: string }>();
  const parsedChanges: Array<{ field: string; from: string; to: string }> = changesParam ? JSON.parse(changesParam) : [];
  // Token: prefer the one from the QR URL param, fall back to current window
  const token = tParam ? parseInt(tParam, 10) : currentToken();
  const [jump, setJump] = useState<JumpFull | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edits, setEdits] = useState<JumpEdit[]>([]);
  const [signerName, setSignerName] = useState('');
  const [signerLicence, setSignerLicence] = useState('');
  const [sigPaths, setSigPaths] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<'pass' | 'repeat' | null>(null);
  const [signerNotes, setSignerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('instructor-sign', {
          body: { action: 'get', jumpId, t: token },
        });
        if (error || !data?.jump) {
          setLoadError(data?.error ?? error?.message ?? 'Could not load jump details.');
          return;
        }
        setJump(data.jump as JumpFull);
        setEdits((data.edits ?? []) as JumpEdit[]);
      } catch (e: any) {
        setLoadError(e?.message ?? 'Network error loading jump.');
      }
    })();
  }, [jumpId]);

  const isStudent = jump?.jumper_type === 'student';

  const handleConfirm = async () => {
    if (sigPaths.length === 0) { Alert.alert('Signature required', 'Please draw your signature above.'); return; }
    if (!signerName.trim()) { Alert.alert('Name required', 'Please enter your full name.'); return; }
    if (isStudent && !signerLicence.trim()) { Alert.alert('Licence required', 'Instructor licence number is required for student sign-off.'); return; }
    if (isStudent && !outcome) { Alert.alert('Outcome required', 'Please select Pass or Repeat for this student jump.'); return; }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('instructor-sign', {
        body: {
          action: 'sign',
          jumpId,
          t: token,
          signature_data: sigPaths.join(' '),
          signer_name: signerName.trim(),
          signer_licence_number: signerLicence.trim() || '',
          outcome: isStudent ? outcome : null,
          notes: signerNotes.trim() || null,
        },
      });
      if (error || !data?.ok) {
        Alert.alert('Error saving signature', data?.error ?? error?.message ?? 'Please try again.');
        return;
      }
      // Navigate to the jump detail
      router.replace(`/(tabs)/log/${jumpId}` as any);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isStudent ? 'Sign as instructor' : 'Sign off'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} scrollEnabled={scrollEnabled}>
          {isStudent ? (
            <View style={styles.roleBanner}>
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.warn} />
              <Text style={styles.roleBannerText}>Student jump — instructor sign-off required</Text>
            </View>
          ) : (
            <View style={styles.roleBannerLicensed}>
              <Ionicons name="people-outline" size={16} color={colors.sky} />
              <Text style={styles.roleBannerLicensedText}>Can be signed by an instructor or fellow licensed jumper</Text>
            </View>
          )}

          {jump ? (
            <View style={styles.card}>
              {/* Header row: jump number + date + badges */}
              <View style={styles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardMono}>JUMP #{jump.jump_number}</Text>
                  <Text style={styles.jumpDate}>{fmtDate(jump.date)}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                  {isStudent && (
                    <View style={styles.studentBadge}><Text style={styles.studentBadgeText}>STUDENT</Text></View>
                  )}
                  {jump.jump_type && (
                    <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{jump.jump_type.toUpperCase()}</Text></View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Location */}
              <View style={styles.cardGrid}>
                <View style={styles.cardCell}>
                  <Text style={styles.cellLabel}>DROPZONE</Text>
                  <Text style={styles.cellValue}>
                    {[jump.dropzones?.name, jump.dropzones?.region].filter(Boolean).join(', ') || '—'}
                  </Text>
                </View>
                <View style={styles.cardCell}>
                  <Text style={styles.cellLabel}>AIRCRAFT</Text>
                  <Text style={styles.cellValue}>
                    {[jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Altitudes & time */}
              <View style={styles.cardGrid}>
                <View style={styles.cardCell}>
                  <Text style={styles.cellLabel}>EXIT ALT</Text>
                  <Text style={styles.cellValue}>{fmtAlt(jump.exit_altitude_ft)}</Text>
                </View>
                <View style={styles.cardCell}>
                  <Text style={styles.cellLabel}>PULL ALT</Text>
                  <Text style={styles.cellValue}>{fmtAlt(jump.pull_altitude_ft)}</Text>
                </View>
                <View style={styles.cardCell}>
                  <Text style={styles.cellLabel}>FREEFALL</Text>
                  <Text style={styles.cellValue}>{fmtSecs(jump.freefall_seconds)}</Text>
                </View>
                <View style={styles.cardCell}>
                  <Text style={styles.cellLabel}>CANOPY</Text>
                  <Text style={styles.cellValue}>{fmtSecs(jump.canopy_seconds)}</Text>
                </View>
              </View>

              {/* Notes */}
              {jump.notes ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.cellLabel}>NOTES</Text>
                  <Text style={styles.notesText}>{jump.notes}</Text>
                </>
              ) : null}

              {/* Landing accuracy */}
              {jump.landing_accuracy_value ? (
                <>
                  <View style={styles.divider} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.cellLabel}>LANDING ACCURACY</Text>
                    <Text style={styles.cellValue}>
                      {`${jump.landing_accuracy_value}${jump.landing_accuracy_unit ? ' ' + jump.landing_accuracy_unit : ''}`}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          ) : loadError ? (
            <View style={{ padding: spacing[4], backgroundColor: 'rgba(255,80,80,0.1)', borderRadius: radii.md, marginBottom: spacing[4] }}>
              <Text style={{ fontFamily: 'InterTight-Medium', fontSize: 14, color: colors.danger }}>{loadError}</Text>
            </View>
          ) : (
            <ActivityIndicator color={colors.sky} style={{ marginVertical: 20 }} />
          )}

          {/* Changes box — shown when arriving from the edit screen */}
          {parsedChanges.length > 0 && (
            <View style={styles.changesBox}>
              <View style={styles.changesHeader}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.warn} />
                <Text style={styles.changesTitle}>Latest edit — review before signing</Text>
              </View>
              {parsedChanges.map((c, i) => (
                <View key={i} style={styles.changeRow}>
                  <Text style={styles.changeField}>{c.field.toUpperCase()}</Text>
                  <View style={styles.changeValues}>
                    <Text style={styles.changeFrom}>{c.from}</Text>
                    <Ionicons name="arrow-forward" size={12} color={colors.fg3} />
                    <Text style={styles.changeTo}>{c.to}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Full edit history from DB */}
          {edits.length > 0 && (
            <View style={styles.historyBox}>
              <Text style={styles.historyBoxTitle}>EDIT HISTORY</Text>
              {edits.map(edit => (
                <View key={edit.id} style={styles.historyEntry}>
                  <Text style={styles.historyEntryDate}>{fmtDate(edit.edited_at)}</Text>
                  {(edit.changes as Array<{ field: string; from: string; to: string }>).map((c, i) => (
                    <View key={i} style={styles.changeRow}>
                      <Text style={styles.changeField}>{c.field.toUpperCase()}</Text>
                      <View style={styles.changeValues}>
                        <Text style={styles.changeFrom}>{c.from}</Text>
                        <Ionicons name="arrow-forward" size={12} color={colors.fg3} />
                        <Text style={styles.changeTo}>{c.to}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          <SignaturePad onChange={setSigPaths} onDrawing={active => setScrollEnabled(!active)} />

          {/* Pass / Repeat — only for student jumps */}
          {isStudent && (
            <View style={styles.outcomeRow}>
              <Label text="OUTCOME" />
              <View style={styles.outcomeBtns}>
                <TouchableOpacity
                  style={[styles.outcomeBtn, outcome === 'pass' && styles.outcomeBtnPass]}
                  onPress={() => setOutcome(outcome === 'pass' ? null : 'pass')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color={outcome === 'pass' ? colors.onSky : colors.fg2} />
                  <Text style={[styles.outcomeBtnText, outcome === 'pass' && { color: colors.onSky }]}>Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.outcomeBtn, outcome === 'repeat' && styles.outcomeBtnRepeat]}
                  onPress={() => setOutcome(outcome === 'repeat' ? null : 'repeat')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh-outline" size={20} color={outcome === 'repeat' ? '#fff' : colors.fg2} />
                  <Text style={[styles.outcomeBtnText, outcome === 'repeat' && { color: '#fff' }]}>Repeat</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: spacing[4] }} />
          <Label text="FULL NAME" />
          <TextInput style={styles.input} value={signerName} onChangeText={setSignerName} placeholder={isStudent ? 'Instructor full name' : 'Full name'} placeholderTextColor={colors.fg3} autoCapitalize="words" autoCorrect={false} />
          <Label text={isStudent ? 'INSTRUCTOR LICENCE #' : 'LICENCE # (optional)'} />
          <TextInput style={styles.input} value={signerLicence} onChangeText={setSignerLicence} placeholder="APF 14829" placeholderTextColor={colors.fg3} autoCapitalize="none" autoCorrect={false} />
          <Label text={isStudent ? 'INSTRUCTOR NOTES' : 'NOTES (optional)'} />
          <TextInput style={[styles.input, styles.textarea]} value={signerNotes} onChangeText={setSignerNotes} multiline numberOfLines={3} placeholder="Instructor notes..." placeholderTextColor={colors.fg3} textAlignVertical="top" />

          <TouchableOpacity
            style={[styles.confirmBtn, saving && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.onSky} />
              : <><Ionicons name="checkmark-circle-outline" size={18} color={colors.onSky} /><Text style={styles.confirmBtnText}>Confirm &amp; sign</Text></>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  back: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  scannedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[5] },
  scannedText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.ok },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[5] },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[3] },
  cardMono: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.8, color: c.fg3 },
  jumpDate: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg, marginTop: 2 },
  typeBadge: { backgroundColor: 'rgba(56,189,248,0.12)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)', borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  typeBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.sky },
  studentBadge: { backgroundColor: 'rgba(255,183,74,0.15)', borderWidth: 1, borderColor: 'rgba(255,183,74,0.4)', borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  studentBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.warn },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing[3] },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  cardCell: { width: '45%' },
  cellLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.fg3 },
  cellValue: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg, marginTop: 2 },
  notesText: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2, marginTop: 4, lineHeight: 20 },
  sigPad: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, overflow: 'hidden', marginBottom: spacing[3] },
  sigCanvas: { height: 160 },
  sigPlaceholder: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  sigPlaceholderText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg3 },
  sigFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing[3], borderTopWidth: 1, borderTopColor: c.border },
  sigHint: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3 },
  roleBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: c.warnBg, borderWidth: 1, borderColor: 'rgba(255,183,74,0.35)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[4] },
  roleBannerText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.warn, flex: 1 },
  roleBannerLicensed: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: c.skyBg, borderWidth: 1, borderColor: 'rgba(74,158,255,0.3)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[4] },
  roleBannerLicensedText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.sky, flex: 1 },
  changesBox: { backgroundColor: c.warnBg, borderWidth: 1, borderColor: 'rgba(255,183,74,0.35)', borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[4] },
  changesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] },
  changesTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.warn },
  changeRow: { marginBottom: spacing[2] },
  changeField: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.fg3, marginBottom: 3 },
  changeValues: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flexWrap: 'wrap' },
  changeFrom: { fontFamily: 'InterTight-Regular', fontSize: 13, color: c.fg2, textDecorationLine: 'line-through' },
  changeTo: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg },
  historyBox: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[4] },
  historyBoxTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[3] },
  historyEntry: { marginBottom: spacing[4], paddingBottom: spacing[4], borderBottomWidth: 1, borderBottomColor: c.border },
  historyEntryDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: c.sky, marginBottom: spacing[2] },
  sigActions: { flexDirection: 'row', gap: spacing[4] },
  sigActionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sigClear: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.sky },
  fsScreen: { flex: 1, backgroundColor: c.bg },
  fsCanvas: { flex: 1 },
  fsFooter: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], paddingBottom: spacing[7] },
  fsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radii.md },
  fsBtnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  fsBtnPrimary: { backgroundColor: c.sky },
  fsBtnGhostText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.fg2 },
  fsBtnPrimaryText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.onSky },
  outcomeRow: { marginBottom: spacing[4] },
  outcomeBtns: { flexDirection: 'row', gap: spacing[3] },
  outcomeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md },
  outcomeBtnPass: { backgroundColor: c.sky, borderColor: c.sky },
  outcomeBtnRepeat: { backgroundColor: c.warn, borderColor: c.warn },
  outcomeBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg2 },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg },
  textarea: { minHeight: 80, paddingTop: spacing[3] },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: c.sky, borderRadius: radii.md, paddingVertical: spacing[4], marginTop: spacing[2] },
  confirmBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.onSky },
  });
}
