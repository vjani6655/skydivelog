import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
  Modal, Dimensions,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { PanResponder } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueueJump, isOfflineError, getRawQueue } from '@/lib/offlineQueue';
import type { QueuedJumpSignature } from '@/lib/offlineQueue';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';
import Toggle from '@/components/ui/Toggle';

// ─── Constants ────────────────────────────────────────────────────────────────
const JUMP_TYPES = ['Belly', 'Tracking', 'Wingsuit', 'Freefly', 'CRW', 'AFF', 'Tandem', 'Coach', 'Demo', 'Night', 'Camera Flying'];

// Maps free-text student stage input (e.g. "AFF 1", "IAD Stage 3") to a valid DB enum value
function sanitizeJumpType(text: string): string | null {
  if (!text.trim()) return null;
  const t = text.trim();
  const exact = JUMP_TYPES.find(v => v.toLowerCase() === t.toLowerCase());
  if (exact) return exact;
  const starts = JUMP_TYPES.find(v => t.toLowerCase().startsWith(v.toLowerCase()));
  if (starts) return starts;
  const contains = JUMP_TYPES.find(v => t.toLowerCase().includes(v.toLowerCase()));
  if (contains) return contains;
  return 'AFF'; // safe default for student jumps
}
const JUMPER_TYPES = ['Licensed', 'Student'];
const PERSIST_KEY = 'new_jump_defaults';
// Logical canvas dims — shared by inline + full-screen so paths are interchangeable
const CANVAS_W = 320;
const CANVAS_H = 200;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseMSS(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(':')) {
    // Plain seconds: "272"
    const n = parseInt(trimmed, 10);
    return isNaN(n) ? null : n;
  }
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0], 10);
  const sec = parseInt(parts[1], 10);
  return (isNaN(m) || isNaN(sec)) ? null : m * 60 + sec;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 'saved';

// ─── Sub-components ───────────────────────────────────────────────────────────
function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function ProgressBar({ step }: { step: Step }) {
  const n = step === 'saved' ? 4 : (step as number);
  return (
    <View style={styles.progressRow}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={[styles.progressSeg, i <= n && styles.progressSegFill]} />
      ))}
    </View>
  );
}

function TypeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Signature Pad ────────────────────────────────────────────────────────────
// paths stored in normalised CANVAS_W × CANVAS_H coordinate space
interface SigPadProps {
  paths: string[];
  onChange: (paths: string[]) => void;
  /** Call with false when drawing starts, true when done — so parent can freeze scroll */
  onDrawing?: (active: boolean) => void;
}

function SignaturePad({ paths, onChange, onDrawing }: SigPadProps) {
  const allPaths = useRef<string[]>(paths);
  const currentPath = useRef('');
  const [tick, setTick] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);

  // Inline canvas layout (to normalise coords)
  const inlineLayout = useRef({ width: CANVAS_W, height: CANVAS_H });

  // Keep allPaths in sync when parent clears externally
  useEffect(() => {
    if (paths.length === 0 && allPaths.current.length > 0) {
      allPaths.current = [];
      currentPath.current = '';
      setTick(t => t + 1);
    }
  }, [paths]);

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

  // Full-screen layout (updated on Modal layout)
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
          <Text style={styles.sigHint}>SIGNATURE</Text>
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

      {/* Full-screen signature modal */}
      <Modal
        visible={fullScreen}
        animationType="slide"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setFullScreen(false)}
      >
        <SafeAreaView style={styles.fsScreen}>
          <View
            style={styles.fsCanvas}
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
          <View style={styles.fsFooter}>
            <TouchableOpacity style={[styles.fsBtn, styles.fsBtnGhost]} onPress={clear}>
              <Text style={styles.fsBtnGhostText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fsBtn, styles.fsBtnPrimary]} onPress={() => setFullScreen(false)}>
              <Ionicons name="checkmark" size={18} color={colors.onSky} />
              <Text style={styles.fsBtnPrimaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ─── Date Picker ──────────────────────────────────────────────────────────────
function DateField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const confirm = () => { onChange(draft); setOpen(false); };
  const cancel = () => { setDraft(value); setOpen(false); };

  return (
    <View style={styles.flex}>
      <Label text="DATE" />
      <TouchableOpacity style={styles.input} onPress={() => { setDraft(value); setOpen(true); }} activeOpacity={0.7}>
        <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg }}>{fmtDate(value)}</Text>
      </TouchableOpacity>
      <Modal transparent animationType="slide" visible={open} onRequestClose={cancel}>
        <TouchableOpacity style={styles.dateModalOverlay} activeOpacity={1} onPress={cancel}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.dateModalSheet}>
              {/* iOS-style toolbar */}
              <View style={styles.dateModalToolbar}>
                <TouchableOpacity onPress={cancel} style={styles.dateModalToolbarBtn}>
                  <Text style={styles.dateModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.dateModalTitle}>Date</Text>
                <TouchableOpacity onPress={confirm} style={styles.dateModalToolbarBtn}>
                  <Text style={styles.dateModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, d) => { if (d) setDraft(d); }}
                textColor={colors.fg}
                themeVariant="dark"
                style={{ height: 216 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Saved screen ─────────────────────────────────────────────────────────────
function SavedScreen({ jumpNum, totalJumps, jumpId }: { jumpNum: number; totalJumps: number; jumpId: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.savedCenter}>
        <View style={styles.savedCircle}>
          <Ionicons name="checkmark" size={42} color={colors.ok} />
        </View>
        <Text style={styles.savedTitle}>Jump #{jumpNum} saved.</Text>
        <Text style={styles.savedSub}>Jump logged and signed off.{'\n'}{totalJumps} jumps in your logbook.</Text>
        <View style={styles.savedStats}>
          <View style={styles.savedStat}><Text style={styles.savedStatLabel}>TOTAL</Text><Text style={styles.savedStatValue}>{totalJumps}</Text></View>
          <View style={[styles.savedStat, styles.savedStatMid]}><Text style={styles.savedStatLabel}>JUMP #</Text><Text style={styles.savedStatValue}>{jumpNum}</Text></View>
          <View style={styles.savedStat}><Text style={styles.savedStatLabel}>STATUS</Text><Text style={[styles.savedStatValue, { color: colors.ok, fontSize: 12 }]}>SAVED</Text></View>
        </View>
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1 }]} onPress={() => router.replace(`/(tabs)/log/${jumpId}`)} activeOpacity={0.8}>
          <Ionicons name="eye-outline" size={16} color={colors.onSky} />
          <Text style={styles.btnPrimaryText}>View jump</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={() => router.replace('/(tabs)/log')} activeOpacity={0.7}>
          <Text style={styles.btnGhostText}>Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function NewJumpScreen() {
  const { draftId } = useLocalSearchParams<{ draftId?: string }>();

  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [draftLoading, setDraftLoading] = useState(!!draftId);
  const [savedJumpId, setSavedJumpId] = useState('');
  const [savedJumpNum, setSavedJumpNum] = useState(0);
  const [totalJumps, setTotalJumps] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Step 1
  const [jumpDate, setJumpDate] = useState(new Date());
  const [jumpNum, setJumpNum] = useState('');
  const [lastJumpNum, setLastJumpNum] = useState<number | null>(null);
  const [dzName, setDzName] = useState('');
  const [acType, setAcType] = useState('');
  const [acRego, setAcRego] = useState('');

  // Step 2
  const [exitAlt, setExitAlt] = useState('14000');
  const [ffSecs, setFfSecs] = useState('60');
  const [canopyInput, setCanopyInput] = useState('');
  const [pullAlt, setPullAlt] = useState('');
  const [jumpType, setJumpType] = useState('');
  const [jumperType, setJumperType] = useState('Licensed');
  const [landingAccuracyValue, setLandingAccuracyValue] = useState('');
  const [landingAccuracyUnit, setLandingAccuracyUnit] = useState('M');
  const [canopyType, setCanopyType] = useState('');
  const [canopyGearId, setCanopyGearId] = useState<string | null>(null);
  const [userCanopies, setUserCanopies] = useState<Array<{ id: string; make_model: string }>>([]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 3
  const [isFav, setIsFav] = useState(false);
  const [notes, setNotes] = useState('');

  // Step 4
  const [signerName, setSignerName] = useState('');
  const [signerLicence, setSignerLicence] = useState('');
  const [sigPaths, setSigPaths] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<'pass' | 'repeat' | null>(null);
  const [signerNotes, setSignerNotes] = useState('');

  // Jump number warning
  const jumpNumInt = parseInt(jumpNum, 10);
  const expectedNext = lastJumpNum !== null ? lastJumpNum + 1 : null;
  // Warning A: skips from the last recorded jump (only when there ARE existing jumps)
  const jumpNumWarning = jumpNum.trim() && !isNaN(jumpNumInt) && expectedNext !== null && jumpNumInt !== expectedNext
    ? `Jump #${jumpNumInt} skips from your last (#${lastJumpNum}). Expected #${expectedNext} — you can still save.`
    : null;
  // Warning B: fresh account starting above #1 (user has prior jumps not in this app)
  const freshStartWarning = lastJumpNum === null && jumpNum.trim() && !isNaN(jumpNumInt) && jumpNumInt > 1
    ? `Starting at #${jumpNumInt} means you have ${jumpNumInt - 1} jump${jumpNumInt - 1 === 1 ? '' : 's'} elsewhere not yet in this app. That’s fine — you can still save.`
    : null;
  const activeWarning = jumpNumWarning ?? freshStartWarning;

  // Load persisted defaults + last jump number on focus (skip when editing a draft)
  useFocusEffect(useCallback(() => {
    if (draftId) return;
    (async () => {
      const saved = await AsyncStorage.getItem(PERSIST_KEY).catch(() => null);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.dzName) setDzName(p.dzName);
        if (p.acType) setAcType(p.acType);
        if (p.acRego) setAcRego(p.acRego);
        if (p.jumperType && p.jumperType !== 'Other') setJumperType(p.jumperType);
      }
      // ── Step 1: fill jump number immediately from local data (fast, no network) ──
      const queue = await getRawQueue();
      const maxQueued = queue.reduce((mx, item) => Math.max(mx, item.payload.jump_number ?? 0), 0);
      const cachedStr = await AsyncStorage.getItem('@jumplogs/last_jump_number').catch(() => null);
      let lastNum: number | null = cachedStr ? parseInt(cachedStr, 10) : null;
      if (maxQueued > (lastNum ?? 0)) lastNum = maxQueued;
      if (lastNum !== null) {
        setLastJumpNum(lastNum);
        setJumpNum(String(lastNum + 1));
      }

      // ── Step 2: upgrade with fresh DB value if online (may silently fail offline) ──
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;
        // Load user's canopies for the canopy type selector
        const { data: canopies } = await supabase
          .from('gear')
          .select('id, make_model')
          .eq('user_id', user.id)
          .eq('type', 'canopy')
          .order('make_model');
        setUserCanopies(canopies ?? []);
        const { data } = await supabase
          .from('jumps')
          .select('jump_number')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('jump_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        const freshLast = data ? Math.max(data.jump_number, maxQueued) : maxQueued;
        if (freshLast > 0) {
          await AsyncStorage.setItem('@jumplogs/last_jump_number', String(freshLast)).catch(() => null);
          setLastJumpNum(freshLast);
          setJumpNum(String(freshLast + 1));
        } else {
          // All jumps deleted (or brand-new user) — reset to a clean slate
          await AsyncStorage.removeItem('@jumplogs/last_jump_number').catch(() => null);
          setLastJumpNum(null);
          setJumpNum('1');
        }
      } catch {
        // offline / token-refresh timeout — step 1 value is already shown, nothing to do
      }
    })();
  }, [draftId]));

  // Load draft data when editing an existing draft
  useEffect(() => {
    if (!draftId) return;
    (async () => {
      setDraftLoading(true);
      const { data } = await supabase
        .from('jumps')
        .select('*, dropzones(name)')
        .eq('id', draftId)
        .single();
      if (data) {
        setJumpDate(new Date(data.date));
        setJumpNum(String(data.jump_number));
        setDzName((data.dropzones as { name: string } | null)?.name ?? '');
        setAcType(data.aircraft_type ?? '');
        setAcRego(data.aircraft_rego ?? '');
        setExitAlt(data.exit_altitude_ft ? String(data.exit_altitude_ft) : '14000');
        setFfSecs(data.freefall_seconds ? String(data.freefall_seconds) : '60');
        setCanopyInput(data.canopy_seconds ? String(data.canopy_seconds) : '');
        setPullAlt(data.pull_altitude_ft ? String(data.pull_altitude_ft) : '');
        setJumpType(data.jump_type ?? '');
        const jt = data.jumper_type ?? 'licensed';
        setJumperType(jt.charAt(0).toUpperCase() + jt.slice(1));
        setCanopyType((data as any).canopy_type ?? '');
        setCanopyGearId((data as any).canopy_gear_id ?? null);
        setIsFav(data.is_favourite ?? false);
        setNotes(data.notes ?? '');
        setLandingAccuracyValue(data.landing_accuracy_value ?? '');
        setLandingAccuracyUnit(data.landing_accuracy_unit ?? 'M');
      }
      setDraftLoading(false);
    })();
  }, [draftId]);

  const handleSave = async () => {
    if (!validateStep4()) return;
    if (!jumpNum.trim() || isNaN(jumpNumInt)) {
      Alert.alert('Jump number required', 'Please enter a jump number.');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }

      // Persist common fields for next time
      await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify({ dzName, acType, acRego, jumperType })).catch(() => null);

      let dropzoneId: string | null = null;
      if (dzName.trim()) {
        const { data: dzRows } = await supabase.from('dropzones').select('id').ilike('name', dzName.trim()).limit(1);
        if (dzRows && dzRows.length > 0) {
          dropzoneId = dzRows[0].id;
        } else {
          const { data: newDz } = await supabase.from('dropzones').insert({ name: dzName.trim(), region: '' }).select('id').single();
          if (newDz) dropzoneId = newDz.id;
        }
      }

      const jumpPayload = {
        jump_number: jumpNumInt,
        date: jumpDate.toISOString(),
        dropzone_id: dropzoneId,
        aircraft_type: acType.trim() || null,
        aircraft_rego: acRego.trim() || null,
        exit_altitude_ft: parseInt(exitAlt, 10) || null,
        freefall_seconds: parseInt(ffSecs, 10) || null,
        canopy_seconds: canopyInput ? parseMSS(canopyInput) : null,
        pull_altitude_ft: parseInt(pullAlt, 10) || null,
        jump_type: jumperType === 'Student' ? sanitizeJumpType(jumpType) : (jumpType || null),
        jump_stage: jumperType === 'Student' ? (jumpType.trim() || null) : null,
        jumper_type: jumperType.toLowerCase(),
        canopy_type: canopyType.trim() || null,
        canopy_gear_id: canopyGearId || null,
        is_favourite: isFav,
        notes: notes.trim() || null,
        landing_accuracy_value: landingAccuracyValue.trim() || null,
        landing_accuracy_unit: landingAccuracyValue.trim() ? landingAccuracyUnit : null,
        is_draft: false,
      };

      let jumpId: string;
      let actualJumpNum: number;

      if (draftId) {
        const { error: updateError } = await supabase.from('jumps').update(jumpPayload).eq('id', draftId);
        if (updateError) { Alert.alert('Error saving jump', `DB: ${updateError.message}`); return; }
        jumpId = draftId;
        actualJumpNum = jumpNumInt;
      } else {
        const { error: insertError } = await supabase.from('jumps').insert({ user_id: user.id, ...jumpPayload });
        if (insertError) {
          if (isOfflineError(insertError.message)) {
            const offlineSig: QueuedJumpSignature | undefined =
              (sigPaths.length > 0 || signerName.trim())
                ? {
                    signature_data: sigPaths.join(' '),
                    signer_name: signerName.trim() || 'Self',
                    signer_licence_number: signerLicence.trim() || '',
                    signer_user_id: user.id,
                    outcome: jumperType === 'Student' ? outcome : null,
                    notes: signerNotes.trim() || null,
                  }
                : undefined;
            await enqueueJump({ user_id: user.id, ...jumpPayload }, offlineSig);
            router.replace('/(tabs)/log');
            return;
          }
          Alert.alert('Error saving jump', `DB: ${insertError.message}`); return;
        }
        const { data: newJump } = await supabase
          .from('jumps')
          .select('id, jump_number')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (!newJump) { Alert.alert('Saved', 'Jump saved but could not load details.'); return; }
        jumpId = newJump.id;
        actualJumpNum = newJump.jump_number;
      }

      if (sigPaths.length > 0 || signerName.trim()) {
        await supabase.from('signatures').insert({
          jump_id: jumpId,
          signature_data: sigPaths.join(' '),
          signer_name: signerName.trim() || 'Self',
          signer_licence_number: signerLicence.trim() || '',
          signer_user_id: user.id,
          outcome: jumperType === 'Student' ? outcome : null,
          notes: signerNotes.trim() || null,
        }).then(null, () => null);
      }

      const { count } = await supabase.from('jumps').select('id', { count: 'exact' }).eq('user_id', user.id).is('deleted_at', null);
      setSavedJumpId(jumpId);
      setSavedJumpNum(actualJumpNum);
      setTotalJumps(count ?? 0);
      setStep('saved');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!jumpNum.trim() || isNaN(jumpNumInt)) {
      Alert.alert('Jump number required', 'Please enter a jump number.');
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }

      await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify({ dzName, acType, acRego, jumperType })).catch(() => null);

      let dropzoneId: string | null = null;
      if (dzName.trim()) {
        const { data: dzRows } = await supabase.from('dropzones').select('id').ilike('name', dzName.trim()).limit(1);
        if (dzRows && dzRows.length > 0) {
          dropzoneId = dzRows[0].id;
        } else {
          const { data: newDz } = await supabase.from('dropzones').insert({ name: dzName.trim(), region: '' }).select('id').single();
          if (newDz) dropzoneId = newDz.id;
        }
      }

      const draftPayload = {
        jump_number: jumpNumInt,
        date: jumpDate.toISOString(),
        dropzone_id: dropzoneId,
        aircraft_type: acType.trim() || null,
        aircraft_rego: acRego.trim() || null,
        exit_altitude_ft: parseInt(exitAlt, 10) || null,
        freefall_seconds: parseInt(ffSecs, 10) || null,
        canopy_seconds: canopyInput ? parseMSS(canopyInput) : null,
        pull_altitude_ft: parseInt(pullAlt, 10) || null,
        jump_type: jumperType === 'Student' ? sanitizeJumpType(jumpType) : (jumpType || null),
        jump_stage: jumperType === 'Student' ? (jumpType.trim() || null) : null,
        jumper_type: jumperType.toLowerCase(),
        canopy_type: canopyType.trim() || null,
        canopy_gear_id: canopyGearId || null,
        is_favourite: isFav,
        notes: notes.trim() || null,
        landing_accuracy_value: landingAccuracyValue.trim() || null,
        landing_accuracy_unit: landingAccuracyValue.trim() ? landingAccuracyUnit : null,
        is_draft: true,
      };

      if (draftId) {
        const { error } = await supabase.from('jumps').update(draftPayload).eq('id', draftId);
        if (error) { Alert.alert('Error saving draft', `DB: ${error.message}`); return; }
      } else {
        const { error: insertError } = await supabase.from('jumps').insert({ user_id: user.id, ...draftPayload });
        if (insertError) { Alert.alert('Error saving draft', `DB: ${insertError.message}`); return; }
      }

      router.replace('/(tabs)/log');
    } finally {
      setSaving(false);
    }
  };

  // ─── Step 1 validation ─────────────────────────────────────────────────────
  const canContinue1 = jumpNum.trim().length > 0 && !isNaN(parseInt(jumpNum, 10));

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!jumpNum.trim() || isNaN(parseInt(jumpNum, 10))) errs.jumpNum = 'Jump number is required';
    if (!dzName.trim()) errs.dzName = 'Dropzone is required';
    if (!acRego.trim()) errs.acRego = 'Aircraft registration is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    const alt = parseInt(exitAlt, 10);
    if (!exitAlt.trim() || isNaN(alt) || alt <= 0) errs.exitAlt = 'Exit altitude is required';
    if (!canopyType.trim()) errs.canopyType = 'Canopy type is required';
    if (!jumpType.trim()) errs.jumpType = jumperType === 'Student' ? 'Jump stage is required' : 'Jump type is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    if (jumperType !== 'Student') return true;
    const errs: Record<string, string> = {};
    if (!notes.trim()) errs.notes = 'Notes are required for student jumps';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep4 = () => {
    const errs: Record<string, string> = {};
    if (sigPaths.length === 0) errs.signature = 'Signature is required';
    if (!signerName.trim()) errs.signerName = 'Signed by is required';
    if (!signerLicence.trim()) errs.signerLicence = 'Licence number is required';
    if (jumperType === 'Student') {
      if (!outcome) errs.outcome = 'Outcome is required for student jumps';
      if (!signerNotes.trim()) errs.signerNotes = 'Instructor notes are required for student jumps';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  if (step === 'saved') {
    return <SavedScreen jumpNum={savedJumpNum} totalJumps={totalJumps} jumpId={savedJumpId} />;
  }

  if (draftLoading) {
    return <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator color={colors.sky} /></View>;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => step === 1 ? router.back() : setStep((step as number) - 1 as Step)} activeOpacity={0.7}>
          <Ionicons name={step === 1 ? 'close' : 'chevron-back'} size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{draftId ? 'Edit draft' : 'New jump'}</Text>
        <Text style={styles.headerStep}>{step as number} / 4</Text>
      </View>

      <ProgressBar step={step} />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >

          {/* ─── Step 1: The basics ─────────────────────────────────────── */}
          {step === 1 && (<>
            <Text style={styles.stepTitle}>The basics</Text>
            <View style={styles.row2}>
              <DateField value={jumpDate} onChange={setJumpDate} />
              <View style={{ width: 110 }}>
                <Label text="JUMP #" />
                <TextInput
                  style={[styles.input, errors.jumpNum ? styles.inputError : null]}
                  value={jumpNum}
                  onChangeText={v => { setJumpNum(v); setErrors(e => ({ ...e, jumpNum: '' })); }}
                  keyboardType="numeric"
                  placeholder="847"
                  placeholderTextColor={colors.fg3}
                />
                {errors.jumpNum && !jumpNumWarning && <Text style={styles.fieldError}>{errors.jumpNum}</Text>}
              </View>
            </View>
            {activeWarning && (
              <View style={styles.warnBox}>
                <Ionicons name="warning-outline" size={14} color={colors.warn} />
                <Text style={styles.warnText}>{activeWarning}</Text>
              </View>
            )}
            <Label text="DROPZONE" />
            <View style={[styles.inputWithIcon, errors.dzName ? styles.inputWithIconError : null]}>
              <Ionicons name="location-outline" size={16} color={errors.dzName ? colors.danger : colors.fg3} style={styles.inputIcon} />
              <TextInput style={styles.inputInner} value={dzName} onChangeText={v => { setDzName(v); setErrors(e => ({ ...e, dzName: '' })); }} placeholder="Skydive Picton" placeholderTextColor={colors.fg3} autoCapitalize="words" autoCorrect={false} />
            </View>
            {errors.dzName && <Text style={styles.fieldError}>{errors.dzName}</Text>}
            <View style={styles.row2}>
              <View style={{ flex: 1.4 }}>
                <Label text="AIRCRAFT TYPE" />
                <View style={styles.inputWithIcon}>
                  <Ionicons name="airplane-outline" size={15} color={colors.fg3} style={styles.inputIcon} />
                  <TextInput style={styles.inputInner} value={acType} onChangeText={setAcType} placeholder="PAC 750XL" placeholderTextColor={colors.fg3} autoCapitalize="words" autoCorrect={false} />
                </View>
              </View>
              <View style={styles.flex}>
                <Label text="REGO" />
                <TextInput
                  style={[styles.input, errors.acRego ? styles.inputError : null]}
                  value={acRego}
                  onChangeText={v => { setAcRego(v); setErrors(e => ({ ...e, acRego: '' })); }}
                  placeholder="VH-PXM"
                  placeholderTextColor={colors.fg3}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                {errors.acRego && <Text style={styles.fieldError}>{errors.acRego}</Text>}
              </View>
            </View>
          </>)}

          {/* ─── Step 2: Altitudes & time ───────────────────────────────── */}
          {step === 2 && (<>
            <Text style={styles.stepTitle}>Altitudes & time</Text>
            <Label text="EXIT ALTITUDE (FT)" />
            <View style={[styles.inputWithIcon, errors.exitAlt ? styles.inputWithIconError : null]}>
              <Ionicons name="trending-up-outline" size={16} color={errors.exitAlt ? colors.danger : colors.fg3} style={styles.inputIcon} />
              <TextInput style={styles.inputInner} value={exitAlt} onChangeText={v => { setExitAlt(v); setErrors(e => ({ ...e, exitAlt: '' })); }} keyboardType="numeric" placeholderTextColor={colors.fg3} />
            </View>
            {errors.exitAlt && <Text style={styles.fieldError}>{errors.exitAlt}</Text>}
            <View style={styles.row2}>
              <View style={styles.flex}><Label text="FREEFALL (S)" /><TextInput style={styles.input} value={ffSecs} onChangeText={setFfSecs} keyboardType="numeric" placeholder="60" placeholderTextColor={colors.fg3} /></View>
              <View style={styles.flex}><Label text="CANOPY TIME (M:SS)" /><TextInput style={styles.input} value={canopyInput} onChangeText={setCanopyInput} placeholder="4:32" placeholderTextColor={colors.fg3} /></View>
            </View>
            <Label text="PULL ALTITUDE (FT) — optional" />
            <TextInput style={styles.input} value={pullAlt} onChangeText={setPullAlt} keyboardType="numeric" placeholder="3500" placeholderTextColor={colors.fg3} />
            <Label text="CANOPY TYPE" />
            {jumperType === 'Licensed' && userCanopies.length > 0 && (
              <View style={styles.chipRow}>
                {userCanopies.map(c => (
                  <TypeChip
                    key={c.id}
                    label={c.make_model}
                    active={canopyGearId === c.id}
                    onPress={() => {
                      if (canopyGearId === c.id) {
                        setCanopyGearId(null);
                        setCanopyType('');
                      } else {
                        setCanopyGearId(c.id);
                        setCanopyType(c.make_model);
                      }
                      setErrors(e => ({ ...e, canopyType: '' }));
                    }}
                  />
                ))}
              </View>
            )}
            <TextInput
              style={[styles.input, errors.canopyType ? styles.inputError : null]}
              value={canopyType}
              onChangeText={v => { setCanopyType(v); setCanopyGearId(null); setErrors(e => ({ ...e, canopyType: '' })); }}
              placeholder={jumperType === 'Student' ? 'e.g. Pilot Student 220' : 'e.g. Sabre 2 170'}
              placeholderTextColor={colors.fg3}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {errors.canopyType && <Text style={styles.fieldError}>{errors.canopyType}</Text>}
            <Label text="JUMP TYPE" />
            {jumperType === 'Student' ? (
              <>
                <TextInput
                  style={[styles.input, errors.jumpType ? styles.inputError : null]}
                  value={jumpType}
                  onChangeText={v => { setJumpType(v); setErrors(e => ({ ...e, jumpType: '' })); }}
                  placeholder="e.g. AFF 1, AFF 2 — Turns, IAD Stage 3"
                  placeholderTextColor={colors.fg3}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                {errors.jumpType && <Text style={styles.fieldError}>{errors.jumpType}</Text>}
              </>
            ) : (
              <>
                <View style={[styles.chipRow, errors.jumpType ? { borderWidth: 1, borderColor: colors.danger, borderRadius: 8, padding: 6 } : null]}>
                  {JUMP_TYPES.map(t => <TypeChip key={t} label={t} active={jumpType === t} onPress={() => { setJumpType(jumpType === t ? '' : t); setErrors(e => ({ ...e, jumpType: '' })); }} />)}
                </View>
                {errors.jumpType && <Text style={styles.fieldError}>{errors.jumpType}</Text>}
              </>
            )}
            <Label text="JUMPER CATEGORY" />
            <View style={styles.chipRow}>
              {JUMPER_TYPES.map(t => <TypeChip key={t} label={t} active={jumperType === t} onPress={() => { setJumperType(t); setJumpType(''); setErrors(e => ({ ...e, jumpType: '' })); }} />)}
            </View>
            <Label text="LANDING ACCURACY — optional" />
            <View style={[styles.row2, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={landingAccuracyValue}
                  onChangeText={setLandingAccuracyValue}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.fg3}
                />
              </View>
              <View style={[styles.chipRow, { flex: 1, marginBottom: 0 }]}>
                {['CM', 'M', 'FT'].map(u => (
                  <TypeChip key={u} label={u} active={landingAccuracyUnit === u} onPress={() => setLandingAccuracyUnit(u)} />
                ))}
              </View>
            </View>
          </>)}

          {/* ─── Step 3: Notes & favourites ─────────────────────────────── */}
          {step === 3 && (<>
            <Text style={styles.stepTitle}>Notes & extras</Text>
            <View style={styles.toggleRow}>
              <View>
                <Text style={styles.toggleTitle}>Favourite jump</Text>
                <Text style={styles.toggleSub}>Star this for quick access.</Text>
              </View>
              <Toggle on={isFav} onChange={setIsFav} />
            </View>
            <Label text={jumperType === 'Student' ? 'NOTES' : 'NOTES (optional)'} />
            <TextInput style={[styles.input, styles.textarea, errors.notes ? styles.inputError : null]} value={notes} onChangeText={v => { setNotes(v); setErrors(e => ({ ...e, notes: '' })); }} multiline numberOfLines={6} placeholder="What happened on this jump?" placeholderTextColor={colors.fg3} textAlignVertical="top" />
            {errors.notes && <Text style={styles.fieldError}>{errors.notes}</Text>}
          </>)}

          {/* ─── Step 4: Sign-off ────────────────────────────────────────── */}
          {step === 4 && (<>
            <Text style={styles.stepTitle}>Sign-off</Text>
            <Text style={styles.stepSub}>{jumperType === 'Student' ? 'Instructor sign-off required. Only an instructor can sign a student jump.' : 'Get a fellow jumper to sign, or hand to an instructor via QR.'}</Text>

            {/* ── Jump summary for the signer to review ── */}
            <View style={styles.signSummaryBox}>
              <View style={styles.signSummaryRow}>
                <View style={styles.signSummaryStat}>
                  <Text style={styles.signSummaryLabel}>JUMP #</Text>
                  <Text style={styles.signSummaryValue}>{jumpNum || '—'}</Text>
                </View>
                <View style={styles.signSummaryStat}>
                  <Text style={styles.signSummaryLabel}>DATE</Text>
                  <Text style={styles.signSummaryValue}>{jumpDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Text>
                </View>
                <View style={styles.signSummaryStat}>
                  <Text style={styles.signSummaryLabel}>EXIT ALT</Text>
                  <Text style={styles.signSummaryValue}>{exitAlt ? `${(parseInt(exitAlt, 10) / 1000).toFixed(1)}k ft` : '—'}</Text>
                </View>
                <View style={styles.signSummaryStat}>
                  <Text style={styles.signSummaryLabel}>FF</Text>
                  <Text style={styles.signSummaryValue}>{ffSecs ? `${ffSecs}s` : '—'}</Text>
                </View>
              </View>
              {(jumpType.trim() || landingAccuracyValue.trim()) ? (
                <View style={[styles.signSummaryRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(74,158,255,0.15)' }]}>
                  {jumpType.trim() ? (
                    <View style={[styles.signSummaryStat, { flex: 2 }]}>
                      <Text style={styles.signSummaryLabel}>TYPE</Text>
                      <Text style={styles.signSummaryValue} numberOfLines={1}>{jumpType}</Text>
                    </View>
                  ) : null}
                  {landingAccuracyValue.trim() ? (
                    <View style={[styles.signSummaryStat, { flex: 2 }]}>
                      <Text style={styles.signSummaryLabel}>LANDING ACCURACY</Text>
                      <Text style={[styles.signSummaryValue, { color: colors.ok }]}>{landingAccuracyValue} {landingAccuracyUnit}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <View style={errors.signature ? { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.lg, marginBottom: 4 } : undefined}>
              <SignaturePad
                paths={sigPaths}
                onChange={p => { setSigPaths(p); setErrors(e => ({ ...e, signature: '' })); }}
                onDrawing={active => setScrollEnabled(!active)}
              />
            </View>
            {errors.signature && <Text style={[styles.fieldError, { marginBottom: 12 }]}>{errors.signature}</Text>}

            {/* Pass / Repeat — only for student jumps */}
            {jumperType === 'Student' && (
              <View style={[styles.outcomeRow, errors.outcome ? styles.outcomeRowError : null]}>
                <Text style={styles.outcomeSectionLabel}>OUTCOME</Text>
                <View style={styles.outcomeBtns}>
                  <TouchableOpacity
                    style={[styles.outcomeBtn, outcome === 'pass' && styles.outcomeBtnPass]}
                    onPress={() => { setOutcome(outcome === 'pass' ? null : 'pass'); setErrors(e => ({ ...e, outcome: '' })); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={outcome === 'pass' ? colors.onSky : colors.fg2} />
                    <Text style={[styles.outcomeBtnText, outcome === 'pass' && { color: colors.onSky }]}>Pass</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.outcomeBtn, outcome === 'repeat' && styles.outcomeBtnRepeat]}
                    onPress={() => { setOutcome(outcome === 'repeat' ? null : 'repeat'); setErrors(e => ({ ...e, outcome: '' })); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh-outline" size={20} color={outcome === 'repeat' ? '#fff' : colors.fg2} />
                    <Text style={[styles.outcomeBtnText, outcome === 'repeat' && { color: '#fff' }]}>Repeat</Text>
                  </TouchableOpacity>
                </View>
                {errors.outcome && <Text style={styles.fieldError}>{errors.outcome}</Text>}
              </View>
            )}

            <View style={{ height: spacing[3] }} />
            <Label text="SIGNED BY" />
            <TextInput style={[styles.input, errors.signerName ? styles.inputError : null]} value={signerName} onChangeText={v => { setSignerName(v); setErrors(e => ({ ...e, signerName: '' })); }} placeholder="Full name" placeholderTextColor={colors.fg3} />
            {errors.signerName && <Text style={styles.fieldError}>{errors.signerName}</Text>}
            <Label text="LICENCE #" />
            <TextInput style={[styles.input, errors.signerLicence ? styles.inputError : null]} value={signerLicence} onChangeText={v => { setSignerLicence(v); setErrors(e => ({ ...e, signerLicence: '' })); }} placeholder="APF 14829" placeholderTextColor={colors.fg3} autoCapitalize="none" autoCorrect={false} />
            {errors.signerLicence && <Text style={styles.fieldError}>{errors.signerLicence}</Text>}
            <Label text={jumperType === 'Student' ? 'INSTRUCTOR NOTES' : 'NOTES (optional)'} />
            <TextInput style={[styles.input, styles.textareaSm, errors.signerNotes ? styles.inputError : null]} value={signerNotes} onChangeText={v => { setSignerNotes(v); setErrors(e => ({ ...e, signerNotes: '' })); }} multiline numberOfLines={3} placeholder="Instructor notes..." placeholderTextColor={colors.fg3} textAlignVertical="top" />
            {errors.signerNotes && <Text style={styles.fieldError}>{errors.signerNotes}</Text>}
          </>)}

        </ScrollView>

        {/* ─── Footer buttons ─────────────────────────────────────────────── */}
        <View style={[styles.footer, step === 4 && { flexDirection: 'column' }]}>
          {step === 1 && (<>
            <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { flex: 2 }]}
              onPress={() => { if (validateStep1()) { setErrors({}); setStep(2); } }}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>Continue</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.onSky} />
            </TouchableOpacity>
          </>)}
          {step === 2 && (<>
            <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={() => setStep(1)} activeOpacity={0.7}><Text style={styles.btnGhostText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 2 }]} onPress={() => { if (validateStep2()) { setErrors({}); setStep(3); } }} activeOpacity={0.8}><Text style={styles.btnPrimaryText}>Continue</Text><Ionicons name="chevron-forward" size={16} color={colors.onSky} /></TouchableOpacity>
          </>)}
          {step === 3 && (<>
            <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={() => setStep(2)} activeOpacity={0.7}><Text style={styles.btnGhostText}>Back</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 2 }]} onPress={() => { if (validateStep3()) { setErrors({}); setStep(4); } }} activeOpacity={0.8}><Ionicons name="create-outline" size={16} color={colors.onSky} /><Text style={styles.btnPrimaryText}>Sign jump</Text></TouchableOpacity>
          </>)}
          {step === 4 && (<>
            <View style={styles.step4Row}>
              <TouchableOpacity style={[styles.btn, styles.btnGhost, { flex: 1 }]} onPress={() => setStep(3)} activeOpacity={0.7}><Text style={styles.btnGhostText}>Back</Text></TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary, { flex: 2 }, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? <ActivityIndicator size="small" color={colors.onSky} /> : <><Ionicons name="checkmark" size={16} color={colors.onSky} /><Text style={styles.btnPrimaryText}>Save & sign jump</Text></>}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.btn, styles.btnGhost, { marginTop: spacing[2] }]} onPress={() => router.push({ pathname: '/(tabs)/log/qr', params: { jumpNum } })} activeOpacity={0.7}>
              <Ionicons name="qr-code-outline" size={16} color={colors.fg2} />
              <Text style={styles.btnGhostText}>Hand to instructor (QR)</Text>
            </TouchableOpacity>
            {jumperType !== 'Student' && (
              <TouchableOpacity style={[styles.btn, styles.btnGhost, { marginTop: spacing[2] }]} onPress={handleSaveDraft} disabled={saving} activeOpacity={0.7}>
                <Ionicons name="bookmark-outline" size={16} color={colors.fg2} />
                <Text style={styles.btnGhostText}>Save as Draft — sign later</Text>
              </TouchableOpacity>
            )}
          </>)}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingTop: spacing[3], paddingBottom: spacing[2] },
  headerBack: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg },
  headerStep: { width: 36, textAlign: 'right', fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: colors.fg3 },
  progressRow: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing[6], paddingBottom: spacing[3] },
  progressSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surface2 },
  progressSegFill: { backgroundColor: colors.sky },
  body: { paddingHorizontal: spacing[6], paddingBottom: spacing[4] },
  stepTitle: { fontFamily: 'InterTight-Bold', fontSize: 22, letterSpacing: -0.4, color: colors.fg, marginBottom: spacing[4], marginTop: spacing[2] },
  stepSub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: colors.fg2, marginTop: -spacing[3], marginBottom: spacing[4] },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg },
  inputError: { borderColor: colors.danger, marginBottom: spacing[1] },
  inputWarn: { borderColor: colors.warn },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginBottom: spacing[4] },
  inputWithIconError: { borderColor: colors.danger, marginBottom: spacing[1] },
  fieldError: { fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.danger, marginBottom: spacing[3], marginTop: spacing[1] },
  inputIcon: { marginLeft: spacing[3] },
  inputInner: { flex: 1, paddingLeft: spacing[2], paddingRight: spacing[3], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg },
  textarea: { minHeight: 120, paddingTop: spacing[3] },
  textareaSm: { minHeight: 80, paddingTop: spacing[3] },
  row2: { flexDirection: 'row', gap: spacing[3] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1], marginBottom: spacing[5] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.sky, borderColor: colors.sky },
  chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: colors.fg2 },
  chipTextActive: { color: colors.onSky },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[4] },
  toggleTitle: { fontFamily: 'InterTight-Medium', fontSize: 15, color: colors.fg },
  toggleSub: { fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg2, marginTop: 2 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2], backgroundColor: 'rgba(255,183,74,0.10)', borderWidth: 1, borderColor: 'rgba(255,183,74,0.3)', borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[3], marginTop: -spacing[2] },
  warnText: { flex: 1, fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.warn },
  // Signature
  sigPad: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, overflow: 'hidden', marginBottom: spacing[3] },
  sigCanvas: { height: 200 },
  sigPlaceholder: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  sigPlaceholderText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg3 },
  sigFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },
  sigHint: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3 },
  sigActions: { flexDirection: 'row', gap: spacing[4] },
  sigActionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  sigClear: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg2 },
  // Full-screen signature modal
  fsScreen: { flex: 1, backgroundColor: colors.bg },
  fsCanvas: { flex: 1 },
  fsFooter: { flexDirection: 'row', gap: spacing[3], padding: spacing[5], paddingBottom: spacing[7] },
  fsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], borderRadius: radii.md },
  fsBtnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  fsBtnPrimary: { backgroundColor: colors.sky },
  fsBtnGhostText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: colors.fg2 },
  fsBtnPrimaryText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: colors.onSky },
  // Outcome (pass/repeat)
  outcomeRow: { marginBottom: spacing[4] },
  outcomeRowError: { borderWidth: 1, borderColor: colors.danger, borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[1] },
  outcomeSectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[2] },
  outcomeBtns: { flexDirection: 'row', gap: spacing[3] },
  outcomeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[4], backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md },
  outcomeBtnPass: { backgroundColor: colors.sky, borderColor: colors.sky },
  outcomeBtnRepeat: { backgroundColor: colors.warn, borderColor: colors.warn },
  // Sign-off jump summary box
  signSummaryBox: { backgroundColor: colors.skyBg, borderWidth: 1, borderColor: 'rgba(74,158,255,0.25)', borderRadius: radii.lg, padding: spacing[4], marginBottom: spacing[4] },
  signSummaryRow: { flexDirection: 'row', gap: spacing[2] },
  signSummaryStat: { flex: 1 },
  signSummaryLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: 2 },
  signSummaryValue: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: colors.fg, letterSpacing: -0.2 },
  outcomeBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.fg2 },
  // Date picker
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dateModalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', paddingBottom: spacing[8] },
  dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  dateModalToolbarBtn: { minWidth: 60 },
  dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.fg },
  dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg2 },
  dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.sky, textAlign: 'right' },
  // Footer
  footer: { flexDirection: 'row', gap: spacing[3], paddingHorizontal: spacing[6], paddingVertical: spacing[3], paddingBottom: spacing[6], borderTopWidth: 1, borderTopColor: colors.border },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], paddingVertical: spacing[3], borderRadius: radii.md },
  btnPrimary: { backgroundColor: colors.sky },
  btnGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.onSky },
  btnGhostText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.fg2 },
  step4Row: { flexDirection: 'row', gap: spacing[3] },
  // Saved screen
  savedCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8] },
  savedCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.okBg, borderWidth: 2, borderColor: colors.ok, alignItems: 'center', justifyContent: 'center', marginBottom: spacing[5] },
  savedTitle: { fontFamily: 'InterTight-Bold', fontSize: 26, letterSpacing: -0.4, color: colors.fg, textAlign: 'center' },
  savedSub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: colors.fg2, textAlign: 'center', marginTop: spacing[2] },
  savedStats: { flexDirection: 'row', width: '100%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginTop: spacing[6] },
  savedStat: { flex: 1, padding: spacing[4], alignItems: 'center' },
  savedStatMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border },
  savedStatLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3 },
  savedStatValue: { fontFamily: 'JetBrainsMono-Medium', fontSize: 18, color: colors.fg, marginTop: 4 },
});
