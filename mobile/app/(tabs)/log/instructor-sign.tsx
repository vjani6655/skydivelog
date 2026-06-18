import { useRef, useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Dimensions, AppState,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { PanResponder } from 'react-native';
import { supabase } from '@/lib/supabase';
import { spacing, radii, shadows } from '@/constants/tokens';
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

  // Inline canvas layout (to normalise coords)
  const inlineLayout = useRef({ width: CANVAS_W, height: CANVAS_H });

  function makePanResponder(getLayout: () => { width: number; height: number }) {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        onDrawing?.(true);
        const layout = getLayout();
        const nx = (e.nativeEvent.locationX / layout.width) * CANVAS_W;
        const ny = (e.nativeEvent.locationY / layout.height) * CANVAS_H;
        currentPath.current = `M ${nx.toFixed(1)} ${ny.toFixed(1)}`;
        setTick(t => t + 1);
      },
      onPanResponderMove: (e) => {
        const layout = getLayout();
        const nx = (e.nativeEvent.locationX / layout.width) * CANVAS_W;
        const ny = (e.nativeEvent.locationY / layout.height) * CANVAS_H;
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

  const inlinePan = useRef(makePanResponder(() => inlineLayout.current)).current;

  // Full-screen layout — sized to fill the rotated landscape view
  const fsLayout = useRef({ width: Dimensions.get('window').height, height: Dimensions.get('window').width });
  const fsPan = useRef(makePanResponder(() => fsLayout.current)).current;

  const clear = () => {
    allPaths.current = [];
    currentPath.current = '';
    onChange([]);
    setTick(t => t + 1);
  };

  const SigPaths = () => (
    <>
      {allPaths.current.map((d, i) => (
        <Path key={i} d={d} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {currentPath.current ? (
        <Path d={currentPath.current} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ) : null}
    </>
  );

  const isEmpty = allPaths.current.length === 0 && !currentPath.current;

  return (
    <>
      {/* Inline pad */}
      <View style={styles.sigPad}>
        <View
          style={styles.sigCanvas}
          {...inlinePan.panHandlers}
          onLayout={e => {
            inlineLayout.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
          }}
        >
          <Svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={StyleSheet.absoluteFill}>
            <SigPaths />
          </Svg>
          {isEmpty && (
            <View style={styles.sigPlaceholder} pointerEvents="none">
              <Text style={styles.sigPlaceholderText}>Sign here</Text>
            </View>
          )}
        </View>
        <View style={styles.sigFooter}>
          <Text style={styles.sigHint}>INSTRUCTOR SIGNATURE</Text>
          <View style={styles.sigActions}>
            <TouchableOpacity onPress={() => setFullScreen(true)} style={styles.sigActionBtn}>
              <Ionicons name="expand-outline" size={16} color={colors.fg2} />
              <Text style={styles.sigClear}>Full screen</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clear} style={styles.sigActionBtn}>
              <Text style={styles.sigClear}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Full-screen signature modal — portrait modal, content rotated 90deg to fill landscape */}
      <Modal
        visible={fullScreen}
        animationType="slide"
        supportedOrientations={['portrait']}
        onRequestClose={() => setFullScreen(false)}
      >
        {(() => {
          const { width: sw, height: sh } = Dimensions.get('window');
          return (
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              {/* Canvas: rotated 90deg, sized to fill the full screen as landscape */}
              <View
                style={{
                  position: 'absolute',
                  width: sh,
                  height: sw,
                  top: (sh - sw) / 2,
                  left: (sw - sh) / 2,
                  transform: [{ rotate: '90deg' }],
                }}
                {...fsPan.panHandlers}
                onLayout={e => {
                  fsLayout.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
                }}
              >
                <Svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={StyleSheet.absoluteFill}>
                  <SigPaths />
                </Svg>
                {isEmpty && (
                  <View style={styles.sigPlaceholder} pointerEvents="none">
                    <Text style={styles.sigPlaceholderText}>Sign here</Text>
                  </View>
                )}
              </View>
              {/* Buttons — counter-rotated so text is upright in landscape hold */}
              <View style={{
                position: 'absolute',
                bottom: spacing[8],
                right: spacing[5],
                gap: spacing[2],
                transform: [{ rotate: '90deg' }],
              }}>
                <TouchableOpacity style={[styles.fsBtn, styles.fsBtnPrimary, { paddingHorizontal: spacing[5] }]} onPress={() => setFullScreen(false)}>
                  <Ionicons name="checkmark" size={16} color={colors.onSky} />
                  <Text style={styles.fsBtnPrimaryText}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.fsBtn, styles.fsBtnGhost, { paddingHorizontal: spacing[5] }]} onPress={isEmpty ? () => setFullScreen(false) : clear}>
                  <Text style={styles.fsBtnGhostText}>{isEmpty ? 'Cancel' : 'Clear'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}
      </Modal>
    </>
  );
}

// Time token — must match the formula in qr.tsx
const EXPIRES_IN = 5 * 60; // seconds per window
const SIGN_MAX_WINDOWS = 12; // max windows after scan that signing is still valid (~60 min)
function currentToken() { return Math.floor(Date.now() / (EXPIRES_IN * 1000)); }
function signDeadlineMs(token: number) { return (token + SIGN_MAX_WINDOWS + 1) * EXPIRES_IN * 1000; }
function fmtTimer(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function InstructorSignScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { jumpId, changes: changesParam, t: tParam } = useLocalSearchParams<{ jumpId: string; changes?: string; t?: string }>();

  const parsedChanges: Array<{ field: string; from: string; to: string }> = changesParam ? JSON.parse(changesParam) : [];

  // ownerMode = arrived from edit.tsx (same user, no QR token).
  // In this mode we load/save directly via the Supabase client and skip the
  // time-token machinery entirely.
  const ownerMode = !tParam;
  const token = tParam ? parseInt(tParam, 10) : currentToken();

  const [jump, setJump] = useState<JumpFull | null>(null);
  const [jumper, setJumper] = useState<{ full_name: string; licence_number: string | null; licence_rating: string | null } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [edits, setEdits] = useState<JumpEdit[]>([]);
  const [signerName, setSignerName] = useState('');
  const [signerLicence, setSignerLicence] = useState('');
  const [sigPaths, setSigPaths] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<'pass' | 'repeat' | null>(null);
  const [signerNotes, setSignerNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Countdown only applies to QR mode (60-min window from when the QR was generated)
  const [secsLeft, setSecsLeft] = useState(() =>
    ownerMode ? Infinity : Math.max(0, Math.floor((signDeadlineMs(token) - Date.now()) / 1000))
  );
  useEffect(() => {
    if (ownerMode) return;
    const id = setInterval(() => {
      setSecsLeft(Math.max(0, Math.floor((signDeadlineMs(token) - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [token, ownerMode]);
  const signExpired = !ownerMode && secsLeft === 0;

  // ── Load jump data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!jumpId) return;
    (async () => {
      try {
        if (ownerMode) {
          // Direct load — RLS allows owner to read their own jump
          const [jumpRes, editsRes] = await Promise.all([
            supabase
              .from('jumps')
              .select('*, dropzones(name, region, latitude, longitude)')
              .eq('id', jumpId)
              .single(),
            supabase
              .from('jump_edits')
              .select('*')
              .eq('jump_id', jumpId)
              .order('edited_at', { ascending: false }),
          ]);
          if (jumpRes.error || !jumpRes.data) {
            setLoadError('Could not load jump details.');
            return;
          }
          setJump(jumpRes.data as JumpFull);
          setEdits((editsRes.data ?? []) as JumpEdit[]);
        } else {
          // QR / cross-user mode — route through the edge function
          const { data, error } = await supabase.functions.invoke('instructor-sign', {
            body: { action: 'get', jumpId, t: token },
          });
          if (error || !data?.jump) {
            let msg = data?.error ?? 'Could not load jump details.';
            if (!data?.error && (error as any)?.context) {
              try { msg = ((await (error as any).context.json()) as any)?.error ?? msg; } catch { /* ignore */ }
            }
            setLoadError(msg);
            return;
          }
          setJump(data.jump as JumpFull);
          setJumper(data.jumper ?? null);
          setEdits((data.edits ?? []) as JumpEdit[]);
        }
      } catch (e: any) {
        setLoadError(e?.message ?? 'Network error loading jump.');
      }
    })();
  }, [jumpId, ownerMode]);

  const isStudent = jump?.jumper_type === 'student';

  // ── Save signature ────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (sigPaths.length === 0) { Alert.alert('Signature required', 'Please draw your signature above.'); return; }
    if (!signerName.trim()) { Alert.alert('Name required', 'Please enter your full name.'); return; }
    if (isStudent && !signerLicence.trim()) { Alert.alert('Licence required', 'Instructor licence number is required for student sign-off.'); return; }
    if (isStudent && !outcome) { Alert.alert('Outcome required', 'Please select Pass or Repeat for this student jump.'); return; }
    setSaving(true);
    try {
      if (ownerMode) {
        // Owner re-sign: update existing signature row if present, otherwise insert
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id ?? null;

        // Check for an existing signature on this jump
        const { data: existingSig } = await supabase
          .from('signatures')
          .select('id, signer_name')
          .eq('jump_id', jumpId)
          .maybeSingle();

        const sigPayload = {
          signature_data: sigPaths.join(' '),
          signer_name: signerName.trim(),
          signer_licence_number: signerLicence.trim() || '',
          signer_user_id: userId,
          outcome: isStudent ? outcome : null,
          notes: signerNotes.trim() || null,
          signed_at: new Date().toISOString(),
        };

        if (existingSig) {
          const { error: sigError } = await supabase
            .from('signatures')
            .update(sigPayload)
            .eq('id', existingSig.id);
          if (sigError) {
            Alert.alert('Error saving signature', sigError.message);
            return;
          }
          // Record the re-sign in edit history so it shows up as a change
          if (userId) {
            await supabase.from('jump_edits').insert({
              jump_id: jumpId,
              user_id: userId,
              changes: [{ field: 'Signature', from: existingSig.signer_name, to: signerName.trim() }],
            });
          }
        } else {
          const { error: sigError } = await supabase.from('signatures').insert({
            jump_id: jumpId,
            ...sigPayload,
          });
          if (sigError) {
            Alert.alert('Error saving signature', sigError.message);
            return;
          }
        }
        await supabase.from('jumps').update({ is_draft: false }).eq('id', jumpId);
      } else {
        // QR / cross-user mode — route through the edge function
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
      }
      if (ownerMode) {
        // Owner re-sign — go straight to the jump detail
        router.dismissAll();
        router.push(`/(tabs)/log/${jumpId}` as any);
      } else {
        // QR mode — show the jump in read-only mode (no edit/delete/favourite)
        router.dismissAll();
        router.push({ pathname: '/(tabs)/log/[id]', params: { id: jumpId, readOnly: 'true' } } as any);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{ownerMode ? 'Sign off' : (isStudent ? 'Sign as instructor' : 'Sign off')}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Signing window timer — QR mode only */}
      {!ownerMode && (
        <View style={[styles.timerBar, signExpired && styles.timerBarExpired]}>
          <Ionicons name="time-outline" size={13} color={signExpired ? colors.danger : colors.fg3} />
          <Text style={[styles.timerText, signExpired && { color: colors.danger }]}>
            {signExpired ? 'SIGNING WINDOW EXPIRED — ask jumper to show QR again' : `SIGN WITHIN ${fmtTimer(secsLeft)}`}
          </Text>
        </View>
      )}

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

          {/* Who is requesting the sign-off — QR mode only */}
          {!ownerMode && jumper ? (
            <View style={styles.jumperBanner}>
              <View style={styles.jumperBannerLeft}>
                <Ionicons name="person-circle-outline" size={30} color={colors.sky} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.jumperBannerLabel}>SIGNING FOR</Text>
                <Text style={styles.jumperBannerName}>{jumper.full_name || 'Jumper'}</Text>
                {(jumper.licence_number || jumper.licence_rating) ? (
                  <Text style={styles.jumperBannerLicence}>
                    {[jumper.licence_rating, jumper.licence_number].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {jump ? (
            <View style={styles.summaryBox}>
              {/* Hero: big jump number + date + badges */}
              <View style={styles.summaryHero}>
                <View style={styles.summaryHeroLeft}>
                  <Text style={styles.summaryHeroLabel}>JUMP</Text>
                  <Text style={styles.summaryHeroNum}>#{jump.jump_number}</Text>
                </View>
                <View style={styles.summaryHeroRight}>
                  <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[1] }}>
                    {isStudent && (
                      <View style={styles.studentBadge}><Text style={styles.studentBadgeText}>STUDENT</Text></View>
                    )}
                    {jump.jump_type && (
                      <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{jump.jump_type.toUpperCase()}</Text></View>
                    )}
                  </View>
                  <Text style={styles.summaryHeroDate}>{fmtDate(jump.date)}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStatRow}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatLabel}>EXIT ALT</Text>
                  <Text style={styles.summaryStatVal}>{jump.exit_altitude_ft ? (jump.exit_altitude_ft / 1000).toFixed(1) : '—'}</Text>
                  {jump.exit_altitude_ft ? <Text style={styles.summaryStatUnit}>k ft</Text> : null}
                </View>
                <View style={styles.summaryStatDiv} />
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatLabel}>FREEFALL</Text>
                  <Text style={styles.summaryStatVal}>{jump.freefall_seconds ?? '—'}</Text>
                  {jump.freefall_seconds ? <Text style={styles.summaryStatUnit}>sec</Text> : null}
                </View>
                {jump.canopy_seconds ? (<>
                  <View style={styles.summaryStatDiv} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatLabel}>CANOPY</Text>
                    <Text style={styles.summaryStatVal}>{jump.canopy_seconds}</Text>
                    <Text style={styles.summaryStatUnit}>sec</Text>
                  </View>
                </>) : null}
                {jump.pull_altitude_ft ? (<>
                  <View style={styles.summaryStatDiv} />
                  <View style={styles.summaryStat}>
                    <Text style={styles.summaryStatLabel}>PULL</Text>
                    <Text style={styles.summaryStatVal}>{(jump.pull_altitude_ft / 1000).toFixed(1)}</Text>
                    <Text style={styles.summaryStatUnit}>k ft</Text>
                  </View>
                </>) : null}
              </View>

              {/* Dropzone + aircraft */}
              {(jump.dropzones?.name || jump.aircraft_type || jump.aircraft_rego) ? (<>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryDetailRow}>
                  {jump.dropzones?.name ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>DROPZONE</Text>
                      <Text style={styles.summaryDetailVal} numberOfLines={1}>{[jump.dropzones.name, jump.dropzones.region].filter(Boolean).join(', ')}</Text>
                    </View>
                  ) : null}
                  {(jump.aircraft_type || jump.aircraft_rego) ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>AIRCRAFT</Text>
                      <Text style={styles.summaryDetailVal} numberOfLines={1}>{[jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(' · ')}</Text>
                    </View>
                  ) : null}
                </View>
              </>) : null}

              {/* Jump type + canopy + jumper type */}
              {(jump.jump_type || (jump as any).canopy_type || jump.jumper_type) ? (<>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryDetailRow}>
                  {jump.jump_type ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>JUMP TYPE</Text>
                      <Text style={styles.summaryDetailVal}>{jump.jump_type}</Text>
                    </View>
                  ) : null}
                  {(jump as any).canopy_type ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>CANOPY</Text>
                      <Text style={styles.summaryDetailVal} numberOfLines={1}>{(jump as any).canopy_type}</Text>
                    </View>
                  ) : null}
                  {jump.jumper_type ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>JUMPER</Text>
                      <Text style={styles.summaryDetailVal}>{jump.jumper_type.charAt(0).toUpperCase() + jump.jumper_type.slice(1)}</Text>
                    </View>
                  ) : null}
                </View>
              </>) : null}

              {/* Landing accuracy + people */}
              {((jump as any).landing_accuracy_value || (jump as any).people_on_jump || (jump as any).is_favourite) ? (<>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryDetailRow}>
                  {(jump as any).landing_accuracy_value ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>LANDING</Text>
                      <Text style={[styles.summaryDetailVal, { color: colors.ok }]}>
                        {(jump as any).landing_accuracy_value}{(jump as any).landing_accuracy_unit ? ' ' + (jump as any).landing_accuracy_unit : ''}
                      </Text>
                    </View>
                  ) : null}
                  {(jump as any).people_on_jump ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>PEOPLE</Text>
                      <Text style={styles.summaryDetailVal}>{(jump as any).people_on_jump}</Text>
                    </View>
                  ) : null}
                  {(jump as any).is_favourite ? (
                    <View style={styles.summaryDetailItem}>
                      <Text style={styles.summaryStatLabel}>FAVOURITE</Text>
                      <Text style={[styles.summaryDetailVal, { color: '#FFD700' }]}>★ Yes</Text>
                    </View>
                  ) : null}
                </View>
              </>) : null}

              {/* Notes */}
              {jump.notes ? (<>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryNotes}>
                  <Text style={styles.summaryStatLabel}>NOTES</Text>
                  <Text style={styles.summaryNotesText}>{jump.notes}</Text>
                </View>
              </>) : null}
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
          <TextInput style={styles.input} value={signerLicence} onChangeText={setSignerLicence} placeholder="APF-2457830" placeholderTextColor={colors.fg3} autoCapitalize="characters" autoCorrect={false} />
          <Label text={isStudent ? 'INSTRUCTOR NOTES' : 'NOTES (optional)'} />
          <TextInput style={[styles.input, styles.textarea]} value={signerNotes} onChangeText={setSignerNotes} multiline numberOfLines={3} placeholder="Instructor notes..." placeholderTextColor={colors.fg3} textAlignVertical="top" />

          <TouchableOpacity
            style={[styles.confirmBtn, (saving || signExpired) && { opacity: 0.6 }]}
            onPress={handleConfirm}
            disabled={saving || signExpired}
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
  timerBar: { flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], paddingHorizontal: spacing[5], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
  timerBarExpired: { backgroundColor: 'rgba(255,80,80,0.08)', borderBottomColor: 'rgba(255,80,80,0.3)' },
  timerText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: c.fg3 },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  scannedBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: 'rgba(74,222,128,0.12)', borderWidth: 1, borderColor: 'rgba(74,222,128,0.3)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[5] },
  scannedText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.ok },
  // Jump summary box — matches step 4 of new.tsx
  summaryBox: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii['2xl'], overflow: 'hidden', marginBottom: spacing[5], ...shadows.card },
  summaryHero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[4], backgroundColor: c.surface2 },
  summaryHeroLeft: { gap: 2 },
  summaryHeroRight: { alignItems: 'flex-end', gap: 2 },
  summaryHeroLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, color: c.fg3 },
  summaryHeroNum: { fontFamily: 'InterTight-Bold', fontSize: 32, letterSpacing: -1, color: c.fg, lineHeight: 36 },
  summaryHeroDate: { fontFamily: 'InterTight-SemiBold', fontSize: 14, letterSpacing: -0.3, color: c.fg },
  summaryDivider: { height: 1, backgroundColor: c.border },
  summaryStatRow: { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[4] },
  summaryStat: { flex: 1, alignItems: 'center', gap: 2 },
  summaryStatDiv: { width: 1, backgroundColor: c.border, marginVertical: 2 },
  summaryStatLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.fg3 },
  summaryStatVal: { fontFamily: 'InterTight-Bold', fontSize: 20, letterSpacing: -0.5, color: c.fg, lineHeight: 24 },
  summaryStatUnit: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.5, color: c.fg3 },
  summaryDetailRow: { flexDirection: 'row', paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[4] },
  summaryDetailItem: { flex: 1, gap: 3 },
  summaryDetailVal: { fontFamily: 'InterTight-SemiBold', fontSize: 14, letterSpacing: -0.2, color: c.fg },
  summaryNotes: { paddingHorizontal: spacing[4], paddingVertical: spacing[3], gap: spacing[1] },
  summaryNotesText: { fontFamily: 'InterTight-Regular', fontSize: 13, lineHeight: 19, color: c.fg2 },
  typeBadge: { backgroundColor: 'rgba(56,189,248,0.12)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.3)', borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  typeBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.sky },
  studentBadge: { backgroundColor: 'rgba(255,183,74,0.15)', borderWidth: 1, borderColor: 'rgba(255,183,74,0.4)', borderRadius: radii.sm, paddingHorizontal: spacing[2], paddingVertical: 2 },
  studentBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: c.warn },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing[3] },
  sigPad: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing[3] },
  sigCanvas: { height: 200 },
  sigPlaceholder: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  sigPlaceholderText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg3 },
  sigFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: c.border },
  sigHint: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3 },
  sigActions: { flexDirection: 'row', gap: spacing[4] },
  sigActionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sigClear: { fontFamily: 'InterTight-Regular', fontSize: 13, color: c.fg2 },
  fsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radii.md },
  fsBtnGhost: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  fsBtnPrimary: { backgroundColor: c.sky },
  fsBtnGhostText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.fg2 },
  fsBtnPrimaryText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.onSky },
  roleBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: c.warnBg, borderWidth: 1, borderColor: 'rgba(255,183,74,0.35)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[4] },
  roleBannerText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.warn, flex: 1 },
  roleBannerLicensed: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: c.skyBg, borderWidth: 1, borderColor: 'rgba(74,158,255,0.3)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[4] },
  roleBannerLicensedText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.sky, flex: 1 },
  jumperBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[4], marginBottom: spacing[4] },
  jumperBannerLeft: { width: 32, alignItems: 'center', justifyContent: 'center' },
  jumperBannerLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1, color: c.fg3, marginBottom: 2 },
  jumperBannerName: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg, letterSpacing: -0.3 },
  jumperBannerLicence: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg2, marginTop: 2 },
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
