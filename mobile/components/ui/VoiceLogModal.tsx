/**
 * VoiceLogModal v2 — dump-and-fill voice journal.
 *
 * Phase 1 (DUMP):     Mic opens immediately. User speaks freely about the jump.
 *                     3 s of silence → stop → GPT-4o-mini extracts every field at once.
 * Phase 2 (FOLLOWUP): One targeted question per missing required field.
 *                     Mic auto-opens after each TTS question; closes on silence.
 * Phase 3 (SUMMARY):  Confirm → saveVoicePrefill → navigate to new.tsx (step 4).
 *
 * TTS : expo-speech, best available iOS voice (premium/enhanced Karen AU preferred).
 * STT : expo-speech-recognition, continuous mode.
 * AI  : GPT-4o-mini via openaiClient.ts; regex from jumpAgent as fallback.
 */

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  sttModule,
  sttAvailable,
  useSafeRecognitionEvent,
} from '@/lib/speechRecognition';
import { speakAI, stopAITTS, prewarmTTS, resetAudioForPlayback } from '@/lib/openaiTTS';
import { spacing, radii, shadows } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { Badge, Button, Card, Progress } from '@/components/ui';
import {
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  FIELD_ORDER,
  FIELD_LABELS,
  getQuestion,
  parseFieldValue,
  parseBoolean,
  saveVoicePrefill,
  saveLastUsedGear,
  loadLastUsedGear,
  validateFieldValue,
  type CollectedFields,
  type FieldKey,
  type LastUsedGear,
  type ValidationWarning,
} from '@/lib/jumpAgent';
import { extractJumpFieldsAI, SAME_AS_LAST_RE } from '@/lib/openaiClient';
import { supabase } from '@/lib/supabase';

// ─── Field display metadata ───────────────────────────────────────────────────
const FIELD_META: {
  key: FieldKey;
  label: string;
  required: boolean;
  fmt: (v: CollectedFields[FieldKey]) => string;
}[] = [
  { key: 'jumpNumber', label: 'JUMP #',    required: true,  fmt: v => `#${v}` },
  { key: 'jumperType',     label: 'JUMPER TYPE',  required: false, fmt: v => String(v) },
  { key: 'dzName',     label: 'DROPZONE',  required: true,  fmt: v => String(v) },
  { key: 'acType',     label: 'AIRCRAFT',  required: true,  fmt: v => String(v) },
  { key: 'acRego',     label: 'REGO',      required: true,  fmt: v => String(v) },
  { key: 'exitAlt',    label: 'EXIT ALT',  required: true,  fmt: v => `${(v as number).toLocaleString()} ft` },
  { key: 'ffSecs',     label: 'FREEFALL TIME', required: true,  fmt: v => `${v} s` },
  { key: 'canopyTime', label: 'CANOPY TIME',   required: true,  fmt: v => String(v) },
  { key: 'canopyType', label: 'CANOPY',       required: true,  fmt: v => { const s = String(v); return s.length > 16 ? s.slice(0, 14) + '…' : s; } },
  { key: 'jumpType',   label: 'JUMP TYPE',    required: true,  fmt: v => String(v) },
  { key: 'notes',      label: 'NOTES',        required: false, fmt: v => String(v) },
  { key: 'isFav',      label: 'FAVOURITE',    required: false, fmt: v => v ? 'Yes' : 'No' },
  { key: 'peopleOnJump', label: 'PEOPLE',     required: false, fmt: v => String(v) },
  { key: 'jumpDate',    label: 'JUMP DATE',   required: false, fmt: v => {
    try {
      const [y, m, d] = (v as string).split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return String(v); }
  }},
  { key: 'jumpTime',    label: 'JUMP TIME',   required: false, fmt: v => {
    try {
      const [h, m] = (v as string).split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch { return String(v); }
  }},
  { key: 'pullAlt',        label: 'PULL ALT',    required: false, fmt: v => `${(v as number).toLocaleString()} ft` },
  { key: 'landingAccuracy', label: 'LANDING DIST', required: false, fmt: v => String(v) },
];

type Status = 'speaking' | 'listening' | 'processing' | 'summary';

interface Props {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
  suggestedJumpNumber?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoiceLogModal({ visible, onClose, onComplete, suggestedJumpNumber }: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [status, setStatus]             = useState<Status>('speaking');
  const [collected, setCollected]       = useState<CollectedFields>({});
  const [agentText, setAgentText]       = useState('');
  const [transcript, setTranscript]     = useState('');
  const [permDenied, setPermDenied]     = useState(false);
  const [saving, setSaving]             = useState(false);
  const [isDumpPhase, setIsDumpPhase]   = useState(true);
  const [tick, setTick]                 = useState(0);  // force grid re-render
  const [summaryListening, setSummaryListening] = useState(false);
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [editingValue, setEditingValue] = useState('');
  // True once audio is actually playing (not just being prepared/fetched)
  const [isAudioReady, setIsAudioReady] = useState(false);

  // ── Refs (used inside event handlers — stale-closure safe) ──────────────────
  const statusRef     = useRef<Status>('speaking');
  const collectedRef  = useRef<CollectedFields>({});
  const isDumpRef     = useRef(true);
  const transcriptRef = useRef('');
  const silenceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintRef       = useRef(suggestedJumpNumber);
  // Prevents any callback from acting after the modal is dismissed
  const isActiveRef   = useRef(false);
  // Mutable ref to askNextField — avoids stale closure when called from processTranscript
  const askNextFieldRef = useRef<(field: FieldKey) => void>(() => {});

  // ── Rail guard constants ──────────────────────────────────────────────────────
  const MAX_FIELD_RETRIES = 3; // max times to ask about ONE field before skipping
  const MAX_TOTAL_TURNS   = 14; // stop the whole conversation after this many user turns

  // ── Confirmation flow (suspicious values) ────────────────────────────────────
  type PendingConfirmation = {
    field: FieldKey;
    value: CollectedFields[FieldKey];
    approvedRest: Partial<CollectedFields>;
    counterQuestion: string;
  };
  const inConfirmationRef   = useRef(false);
  const pendingConfirmRef   = useRef<PendingConfirmation | null>(null);
  const retryCountRef       = useRef<Partial<Record<FieldKey, number>>>({});
  const totalTurnsRef       = useRef(0);
  const lastGearRef         = useRef<LastUsedGear | null>(null);
  const optionalAskedRef    = useRef(false);
  // True while we're waiting for the user's answer to the combined optional question.
  // During this window, optional fields are allowed to overwrite existing values.
  const waitingForOptionalRef = useRef(false);
  // True while we're listening for a correction after the summary is shown.
  const summaryListeningRef = useRef(false);
  // True while processing a summary-mode correction — allows overwriting any already-set field.
  const summaryCorrectRef = useRef(false);
  // True after we've already asked for jumpTime following a jumpDate extraction — ask only once.
  const askedJumpTimeRef  = useRef(false);
  // Guards against duplicate 'end' events fired by iOS for a single STT session.
  const sttEndHandledRef  = useRef(false);

  // Keep refs in sync
  useEffect(() => { statusRef.current = status; },       [status]);
  useEffect(() => { collectedRef.current = collected; }, [collected]);
  useEffect(() => { hintRef.current = suggestedJumpNumber; }, [suggestedJumpNumber]);

  // ── Pulse animation ──────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.22, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    pulseLoop.current = null;
    Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true }).start();
  }, [pulseAnim]);

  // ── Load last-used gear on mount (for "same as last" auto-fill) ──────────────
  // 1. Try AsyncStorage (fast, set after every voice log save)
  // 2. Fall back to the most recent Supabase jump if AsyncStorage has no canopy info
  useEffect(() => {
    async function loadGear() {
      let gear = await loadLastUsedGear().catch(() => null);
      // If no canopy in cache, pull from the user's most recent jump in the DB
      if (!gear?.canopyType) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data } = await supabase
              .from('jumps')
              .select('aircraft_type, aircraft_rego, canopy_type')
              .eq('user_id', user.id)
              .is('deleted_at', null)
              .order('jump_number', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (data) {
              gear = {
                acType:     data.aircraft_type ?? gear?.acType ?? '',
                acRego:     data.aircraft_rego ?? gear?.acRego ?? '',
                canopyType: data.canopy_type ?? undefined,
              };
            }
          }
        } catch { /* non-critical — continue without gear hint */ }
      }
      lastGearRef.current = gear;
    }
    loadGear();
  }, []);

  // ── Core helpers (all read mutable state via refs) ───────────────────────────
  const clearSilence = useCallback(() => {
    if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; }
  }, []);

  const speakAgent = useCallback((text: string, onDone?: () => void) => {
    setAgentText(text);
    setStatus('speaking');
    statusRef.current = 'speaking';
    setIsAudioReady(false); // reset — audio isn't playing yet

    const t0 = Date.now();
    console.log(`[VOICE] speakAgent called t=0 text="${text.slice(0, 40)}"`);

    // 30-second absolute safety net — in case of network issues or any other
    // failure that prevents speakAI's onDone from firing.
    const safetyTimer = setTimeout(() => {
      if (isActiveRef.current && statusRef.current === 'speaking') onDone?.();
    }, 30_000);

    speakAI(
      text,
      () => {
        console.log(`[VOICE] TTS done t+${Date.now() - t0}ms`);
        clearTimeout(safetyTimer);
        if (isActiveRef.current) onDone?.();
      },
      () => {
        console.log(`[VOICE] TTS audio started (onStarted) t+${Date.now() - t0}ms`);
        if (isActiveRef.current) setIsAudioReady(true);
      },
    );
  }, []);

  const startListening = useCallback(async (silenceMs: number) => {
    if (!sttModule) return;
    const { granted } = await sttModule.requestPermissionsAsync();
    if (!granted) { setPermDenied(true); return; }

    transcriptRef.current = '';
    setTranscript('');
    startPulse();

    // Grace period: let iOS release the AVAudioSession after TTS before starting STT.
    // IMPORTANT: do NOT set statusRef = 'listening' until after this delay — stale
    // SpeechRecognizer 'end' events fire during this window and must be ignored.
    await new Promise<void>(r => setTimeout(r, 350));
    if (!isActiveRef.current) return; // modal closed while waiting

    setStatus('listening');
    statusRef.current = 'listening';
    sttEndHandledRef.current = false;
    console.log('[STT] starting recognition...');
    sttModule.start({ lang: 'en-AU', interimResults: true, maxAlternatives: 1, continuous: true });

    // Failsafe: stop if user says nothing for silenceMs
    clearSilence();
    silenceRef.current = setTimeout(() => {
      if (statusRef.current === 'listening') sttModule?.stop();
    }, silenceMs);
  }, [startPulse, clearSilence]);

  const stopListening = useCallback(() => {
    clearSilence();
    sttModule?.stop();
    stopPulse();
  }, [clearSilence, stopPulse]);

  /**
   * Listens for up to 5 s after the summary is shown so the user can
   * speak a correction. Does NOT change `status` — summary stays visible.
   */
  const startSummaryListen = useCallback(async () => {
    if (!sttModule || !isActiveRef.current) return;
    const { granted } = await sttModule.requestPermissionsAsync();
    if (!granted) return;
    transcriptRef.current = '';
    setTranscript('');
    await new Promise<void>(r => setTimeout(r, 350));
    if (!isActiveRef.current) return;
    summaryListeningRef.current = true;
    setSummaryListening(true);
    sttEndHandledRef.current = false;
    sttModule.start({ lang: 'en-AU', interimResults: true, maxAlternatives: 1, continuous: true });
    clearSilence();
    silenceRef.current = setTimeout(() => {
      if (summaryListeningRef.current) sttModule?.stop();
      // startSummaryListen will be restarted in the STT 'end' handler if no speech was captured
    }, 8000);
  }, [clearSilence]);

  const processTranscript = useCallback(async (text: string) => {
    if (!isActiveRef.current) return; // modal closed — discard
    setStatus('processing');
    statusRef.current = 'processing';
    setTranscript('');
    stopPulse();

    // ── Confirmation mode ─────────────────────────────────────────────────────
    if (inConfirmationRef.current && pendingConfirmRef.current) {
      const { field, value, approvedRest, counterQuestion } = pendingConfirmRef.current;
      const confirmed = parseBoolean(text);

      if (confirmed === true) {
        const next = { ...collectedRef.current, [field]: value, ...approvedRest };
        collectedRef.current = next;
        setCollected(next);
        setTick(t => t + 1);
        inConfirmationRef.current = false;
        pendingConfirmRef.current = null;
        const missing = REQUIRED_FIELDS.filter(f => next[f] === undefined);
        if (missing.length === 0) {
          if (!optionalAskedRef.current) {
            optionalAskedRef.current = true;
            const missingOpt = OPTIONAL_FIELDS.filter(f => next[f] === undefined);
            if (missingOpt.length > 0) {
              const parts: string[] = [];
              if (next.notes === undefined)        parts.push('any notes');
              if (next.isFav === undefined)        parts.push('if it was a favourite');
              if (next.peopleOnJump === undefined) parts.push('how many people were on the jump');
              waitingForOptionalRef.current = true;
              speakAgent(
                `Almost done! Want to add ${parts.join(', or ')}? Or say skip.`,
                () => startListening(5000),
              );
              return;
            }
          }
          speakAgent("Got it — I have everything I need. Does this look right?", () => {
            setStatus('summary'); statusRef.current = 'summary';
            startSummaryListen();
          });
        } else {
          askNextFieldRef.current(missing[0]);
        }
      } else if (confirmed === false) {
        const next = { ...collectedRef.current, ...approvedRest };
        collectedRef.current = next;
        setCollected(next);
        setTick(t => t + 1);
        inConfirmationRef.current = false;
        pendingConfirmRef.current = null;
        retryCountRef.current[field] = 0;
        askNextFieldRef.current(field);
      } else {
        speakAgent(counterQuestion, () => startListening(4000));
      }
      return;
    }

    // ── Total turn rail guard (only counts during field-collection phase) ────
    const isSummaryCorrect = summaryCorrectRef.current;
    if (isSummaryCorrect) summaryCorrectRef.current = false;
    if (!isSummaryCorrect) totalTurnsRef.current++;
    if (!isSummaryCorrect && totalTurnsRef.current > MAX_TOTAL_TURNS) {
      speakAgent("I've done my best. Here's what I gathered — you can fill in the rest manually.", () => {
        setStatus('summary'); statusRef.current = 'summary';
      });
      return;
    }

    // ── GPT-4o-mini extraction; regex fallback ───────────────────────────────
    let extracted: Partial<CollectedFields> = {};
    try {
      // Supplement lastGear with currently-collected values so "same as last" phrases
      // resolve even within the same voice session (e.g. aircraft set then user says "same canopy")
      const c = collectedRef.current;
      const l = lastGearRef.current;
      // Don't forward unresolved "same as last" text as a gear hint — strip it.
      const resolvedCanopy = c.canopyType && !SAME_AS_LAST_RE.test(String(c.canopyType)) ? c.canopyType : l?.canopyType;
      const resolvedAcType = c.acType && !SAME_AS_LAST_RE.test(String(c.acType)) ? c.acType : l?.acType;
      const resolvedAcRego = c.acRego && !SAME_AS_LAST_RE.test(String(c.acRego)) ? c.acRego : l?.acRego;
      const dynamicGear: { acType: string; acRego: string; canopyType?: string } | undefined =
        (resolvedAcType || resolvedAcRego || resolvedCanopy)
          ? { acType: resolvedAcType ?? '', acRego: resolvedAcRego ?? '', canopyType: resolvedCanopy }
          : undefined;
      extracted = await extractJumpFieldsAI(text, {
        suggestedJumpNumber: hintRef.current,
        lastGear: dynamicGear,
      });
    } catch {
      for (const field of FIELD_ORDER) {
        const r = parseFieldValue(field, text);
        if (r.ok) (extracted as Record<string, unknown>)[field] = r.value;
      }
    }

    if (!isActiveRef.current) return; // closed while awaiting GPT response

    // Only update fields not already confirmed (never overwrite).
    // Exception: when waiting for the optional-fields answer, allow optional field updates
    // (the user is explicitly answering — they may correct a previously auto-inferred value).
    const isOptionalAnswer = waitingForOptionalRef.current;
    if (isOptionalAnswer) waitingForOptionalRef.current = false;

    const newFields: Partial<CollectedFields> = {};
    for (const [k, v] of Object.entries(extracted)) {
      const isOpt = OPTIONAL_FIELDS.includes(k as FieldKey);
      // Allow overwrite: optional fields during optional phase, any field during summary correction
      if (collectedRef.current[k as FieldKey] === undefined || (isOpt && isOptionalAnswer) || isSummaryCorrect) {
        (newFields as Record<string, unknown>)[k] = v;
      }
    }

    // ── Validate each new field ───────────────────────────────────────────────
    // ── Voice log is for licensed skydivers only — redirect students ────────
    if (newFields.jumperType === 'Student') {
      const { jumperType: _dropped, ...rest } = newFields;
      Object.assign(newFields, rest);
      delete (newFields as Partial<CollectedFields>).jumperType;
      speakAgent(
        "Voice log is only for licensed skydivers. For student or AFF jumps, please use manual entry instead.",
        () => startListening(5000),
      );
      return;
    }

    let warning: ValidationWarning | null = null;
    const approvedFields: Partial<CollectedFields> = {};
    for (const [k, v] of Object.entries(newFields)) {
      if (!warning) {
        warning = validateFieldValue(k as FieldKey, v as CollectedFields[FieldKey], { suggestedJumpNumber: hintRef.current });
        if (warning) continue;
      }
      (approvedFields as Record<string, unknown>)[k] = v;
    }

    if (warning) {
      const mergedSoFar = { ...collectedRef.current, ...approvedFields };
      collectedRef.current = mergedSoFar;
      setCollected(mergedSoFar);
      setTick(t => t + 1);
      pendingConfirmRef.current = {
        field: warning.field,
        value: warning.value,
        approvedRest: {},
        counterQuestion: warning.counterQuestion,
      };
      inConfirmationRef.current = true;
      speakAgent(warning.counterQuestion, () => startListening(4000));
      return;
    }

    // ── No suspicious values — merge all ────────────────────────────────────
    let next = { ...collectedRef.current, ...approvedFields };

    // ── Clear any unresolved "same as last" values ────────────────────────────
    // These can sneak in if GPT returns the literal phrase and there was no lastGear to resolve.
    // Remove them so the agent asks the question again.
    const CLEARABLE_SAME_AS_LAST: FieldKey[] = ['canopyType', 'acType', 'acRego', 'notes'];
    let clearedUnresolved = false;
    for (const f of CLEARABLE_SAME_AS_LAST) {
      if (typeof next[f] === 'string' && SAME_AS_LAST_RE.test(next[f] as string)) {
        const { [f]: _dropped, ...rest } = next;
        next = rest as typeof next;
        clearedUnresolved = true;
      }
    }
    collectedRef.current = next;
    setCollected(next);
    setTick(t => t + 1);

    // ── If a date was captured but no time yet, ask for the time ────────────
    if (next.jumpDate !== undefined && next.jumpTime === undefined && !askedJumpTimeRef.current) {
      askedJumpTimeRef.current = true;
      speakAgent(
        'What time was the jump? Say something like 2 PM or 2:30 PM. Or say skip.',
        () => startListening(5000),
      );
      return;
    }

    const missing = REQUIRED_FIELDS.filter(f => next[f] === undefined);

    if (missing.length === 0) {
      if (!optionalAskedRef.current) {
        optionalAskedRef.current = true;
        const missingOpt = OPTIONAL_FIELDS.filter(f => next[f] === undefined);
        if (missingOpt.length > 0) {
          const parts: string[] = [];
          if (next.notes === undefined)            parts.push('any notes');
          if (next.isFav === undefined)            parts.push('if it was a favourite');
          if (next.peopleOnJump === undefined)     parts.push('how many people were on the jump');
          if (next.pullAlt === undefined)          parts.push('your pull altitude');
          if (next.landingAccuracy === undefined)  parts.push('any landing accuracy');
          if (next.jumpDate === undefined)         parts.push('the date');
          waitingForOptionalRef.current = true;
          speakAgent(
            `Almost done! Want to add ${parts.join(', or ')}? Or say skip.`,
            () => startListening(5000),
          );
          return;
        }
      }
      const summaryMessage = isSummaryCorrect
        ? 'Updated! Does this look right now?'
        : 'Got it — I have everything I need. Does this look right?';
      speakAgent(summaryMessage, () => {
        setStatus('summary'); statusRef.current = 'summary';
        startSummaryListen();
      });
    } else if (isDumpRef.current) {
      isDumpRef.current = false;
      setIsDumpPhase(false);
      askNextFieldRef.current(missing[0]);
    } else {
      askNextFieldRef.current(missing[0]);
    }
  }, [speakAgent, startListening, stopPulse]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Asks a missing field with per-field retry rail guard.
   * Stored in askNextFieldRef so processTranscript always calls the latest version.
   */
  const askNextField = useCallback((field: FieldKey) => {
    if (!isActiveRef.current) return;
    const retries = retryCountRef.current[field] ?? 0;
    if (retries >= MAX_FIELD_RETRIES) {
      retryCountRef.current[field] = 0;
      const label = FIELD_LABELS[field] ?? field;
      const missing = REQUIRED_FIELDS.filter(f => collectedRef.current[f] === undefined && f !== field);
      if (missing.length === 0) {
        speakAgent(`I'll skip ${label} — you can fill it in manually. Here's what I have.`, () => {
          setStatus('summary'); statusRef.current = 'summary';
        });
      } else {
        speakAgent(`I'll skip ${label} for now. ${getQuestion(missing[0])}`, () => startListening(4000));
        retryCountRef.current[missing[0]] = (retryCountRef.current[missing[0]] ?? 0) + 1;
      }
      return;
    }
    retryCountRef.current[field] = retries + 1;
    // Prewarm the next likely question while asking this one
    const otherMissing = REQUIRED_FIELDS.filter(f => f !== field && collectedRef.current[f] === undefined);
    if (otherMissing.length > 0) prewarmTTS(getQuestion(otherMissing[0]));
    speakAgent(getQuestion(field), () => startListening(4000));
  }, [speakAgent, startListening]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep ref in sync so processTranscript always calls the latest askNextField
  useEffect(() => { askNextFieldRef.current = askNextField; }, [askNextField]);

  // ── STT event handlers ───────────────────────────────────────────────────────
  useSafeRecognitionEvent('result', (event: any) => {
    const text: string = event.results?.[0]?.transcript ?? '';
    console.log('[STT] result:', JSON.stringify(text), 'status:', statusRef.current);
    transcriptRef.current = text;
    setTranscript(text);

    // Reset silence timer on every partial result
    if (statusRef.current === 'listening' && text.trim()) {
      clearSilence();
      const ms = isDumpRef.current ? 5000 : 3500;
      silenceRef.current = setTimeout(() => {
        if (statusRef.current === 'listening') sttModule?.stop();
      }, ms);
    } else if (summaryListeningRef.current && text.trim()) {
      // Extend the silence window while user is speaking a correction
      clearSilence();
      silenceRef.current = setTimeout(() => {
        if (summaryListeningRef.current) sttModule?.stop();
      }, 3500);
    }
  });

  useSafeRecognitionEvent('end', () => {
    const sttEndAt = Date.now();
    stopPulse();
    // Start transitioning the AVAudioSession from recording (earpiece) back to
    // playback (speaker) immediately — the earlier this fires the less likely
    // TTS will be routed to the earpiece when it plays.
    resetAudioForPlayback().then(() =>
      console.log(`[VOICE] resetAudioForPlayback resolved t+${Date.now() - sttEndAt}ms after STT end`)
    );
    console.log('[STT] end, status:', statusRef.current, 'transcript:', JSON.stringify(transcriptRef.current));
    if (!isActiveRef.current) return; // modal closed
    if (sttEndHandledRef.current) { console.log('[STT] duplicate end event — ignored'); return; }
    sttEndHandledRef.current = true;
    // Summary correction window: user spoke after "Does this look right?"
    if (summaryListeningRef.current) {
      summaryListeningRef.current = false;
      setSummaryListening(false);
      clearSilence();
      const text = transcriptRef.current.trim();
      if (!text) {
        // Nothing heard — restart the listen window so user can still correct
        startSummaryListen();
        return;
      }

      const boolVal = parseBoolean(text);
      // Only treat as a pure confirmation if the text is very short (just "yes"/"yeah"/etc.).
      // A long response like "yeah change the aircraft to AIRVAN" should be treated as a correction.
      const isPureConfirm = boolVal === true && text.split(/\s+/).length <= 3;
      const isPureDeny    = boolVal === false && text.split(/\s+/).length <= 4;

      if (isPureConfirm) {
        // User confirmed — proceed to fill in
        handleConfirm();
        return;
      }

      if (isPureDeny) {
        // User said "no" without specifying what — ask what they want to change
        summaryCorrectRef.current = true;
        speakAgent('What would you like to change?', () => startListening(8000));
        return;
      }

      // User spoke a full correction ("change the aircraft to AIRVAN", "notes should be X", etc.)
      summaryCorrectRef.current = true;
      processTranscript(text);
      return;
    }
    if (statusRef.current !== 'listening') return;
    clearSilence();
    const text = transcriptRef.current.trim();
    if (text) {
      processTranscript(text);
    } else if (inConfirmationRef.current && pendingConfirmRef.current) {
      // Nothing heard during confirmation — repeat the counter-question
      speakAgent(pendingConfirmRef.current.counterQuestion, () => startListening(4000));
    } else {
      // Nothing heard — re-ask
      const missing = REQUIRED_FIELDS.filter(f => collectedRef.current[f] === undefined);
      const msg = isDumpRef.current
        ? "I didn't catch that. Tell me about your jump — dropzone, aircraft, freefall time, and jump type."
        : missing.length > 0 ? getQuestion(missing[0]) : '';
      if (msg) speakAgent(msg, () => startListening(isDumpRef.current ? 5000 : 4000));
    }
  });

  useSafeRecognitionEvent('error', (event: any) => {
    stopPulse();
    resetAudioForPlayback();
    if (summaryListeningRef.current) {
      summaryListeningRef.current = false;
      setSummaryListening(false);
      clearSilence();
      return;
    }
    if (event.error === 'aborted' || statusRef.current !== 'listening') return;
    clearSilence();
    if (event.error === 'no-speech') {
      startListening(isDumpRef.current ? 5000 : 4000);
    }
  });

  // ── Init / reset ─────────────────────────────────────────────────────────────
  const startConversation = useCallback(() => {
    // Pre-fill jump number from suggestion so user doesn't have to say it explicitly.
    // jumperType is always Licensed — voice log is for licensed skydivers only.
    const prefill: CollectedFields = {
      ...(suggestedJumpNumber ? { jumpNumber: suggestedJumpNumber } : {}),
      jumperType: 'Licensed',
    };
    collectedRef.current      = prefill;
    isDumpRef.current         = true;
    transcriptRef.current     = '';
    inConfirmationRef.current = false;
    pendingConfirmRef.current = null;
    retryCountRef.current     = {};
    totalTurnsRef.current     = 0;
    optionalAskedRef.current  = false;
    waitingForOptionalRef.current = false;
    askedJumpTimeRef.current  = false;
    setCollected(prefill);
    setTranscript('');
    setIsDumpPhase(true);
    setPermDenied(false);
    setTick(t => t + 1);

    const greeting = suggestedJumpNumber
      ? `I'll log jump ${suggestedJumpNumber}. Tell me about your jump — say the dropzone, aircraft, exit altitude, freefall and canopy times, and jump type. Just speak naturally.`
      : `Tell me about your jump. Say the dropzone, aircraft, exit altitude, freefall and canopy times, and jump type. Speak naturally and I'll fill in what I can.`;

    speakAgent(greeting, () => startListening(4500));
  }, [suggestedJumpNumber, speakAgent, startListening]);

  useEffect(() => {
    isActiveRef.current = visible;
    if (visible) {
      // Start TTS fetch immediately so the opening greeting plays with no delay
      const greeting = suggestedJumpNumber
        ? `I'll log jump ${suggestedJumpNumber}. Tell me about your jump — say the dropzone, aircraft, exit altitude, freefall and canopy times, and jump type. Just speak naturally.`
        : `Tell me about your jump. Say the dropzone, aircraft, exit altitude, freefall and canopy times, and jump type. Speak naturally and I'll fill in what I can.`;
      prewarmTTS(greeting);
      startConversation();
    } else {
      clearSilence();
      stopAITTS().catch(() => { /* ignore */ });
      if (statusRef.current === 'listening') sttModule?.abort();
      stopPulse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // ── Confirm & save ───────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setSaving(true);
    await Promise.all([
      saveVoicePrefill(collectedRef.current),
      saveLastUsedGear(collectedRef.current),
    ]);
    // Update in-memory gear so next session in this run is also covered
    if (collectedRef.current.acType || collectedRef.current.canopyType) {
      lastGearRef.current = {
        acType: collectedRef.current.acType ?? '',
        acRego: collectedRef.current.acRego ?? '',
        canopyType: collectedRef.current.canopyType,
      };
    }
    setSaving(false);
    onComplete();
  };

  const handleClose = () => {
    isActiveRef.current = false; // block any in-flight TTS onDone / STT end callbacks
    clearSilence();
    stopPulse();
    stopAITTS().catch(() => { /* ignore */ });
    sttModule?.abort();
    onClose();
  };

  // ── Manual field editing (summary screen) ────────────────────────────────────
  function rawEditValue(key: FieldKey, val: CollectedFields[FieldKey]): string {
    if (val === undefined || val === null) return '';
    if (key === 'isFav') return (val as boolean) ? 'yes' : 'no';
    return String(val);
  }

  const openEdit = (key: FieldKey, val: CollectedFields[FieldKey]) => {
    setEditingField(key);
    setEditingValue(rawEditValue(key, val));
  };

  const cancelEdit = () => setEditingField(null);

  const commitEdit = () => {
    if (!editingField) return;
    const t = editingValue.trim();
    setEditingField(null);
    if (!t) return;
    let parsed: CollectedFields[FieldKey] | undefined;
    switch (editingField) {
      case 'jumpNumber':
      case 'exitAlt':
      case 'ffSecs':
      case 'peopleOnJump': {
        const n = parseInt(t, 10);
        if (!isNaN(n)) parsed = n;
        break;
      }
      case 'isFav':
        parsed = /^(y|yes|true|1)$/i.test(t);
        break;
      case 'canopyTime':
        if (/^\d+:\d{2}$/.test(t)) parsed = t;
        break;
      default:
        parsed = t;
    }
    if (parsed !== undefined) {
      const next = { ...collectedRef.current, [editingField]: parsed };
      collectedRef.current = next;
      setCollected(next);
      setTick(tc => tc + 1);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const collectedCount = REQUIRED_FIELDS.filter(f => collected[f] !== undefined).length;
  const progressValue = collectedCount / REQUIRED_FIELDS.length;
  const phaseLabel = status === 'summary'
    ? 'Review'
    : isDumpPhase
      ? 'Initial capture'
      : 'Gap fill';
  const statusLabel = status === 'listening'
    ? 'Listening live'
    : status === 'processing'
      ? 'Structuring'
      : status === 'speaking'
        ? (isAudioReady ? 'Speaking' : 'Preparing audio')
        : 'Ready to confirm';
  const completedFields = FIELD_META.filter(meta => collected[meta.key] !== undefined);
  const requiredFields = FIELD_META.filter(meta => meta.required);
  const optionalFields = FIELD_META.filter(meta => !meta.required);

  // ── Fallback for Expo Go ──────────────────────────────────────────────────────
  if (!sttAvailable) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={styles.screen}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="mic-outline" size={18} color={colors.sky} />
              <Text style={styles.headerTitle}>Voice Log</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.fg2} />
            </TouchableOpacity>
          </View>
          <View style={styles.fallbackWrap}>
            <Card variant="warning" style={styles.fallbackCard}>
              <View style={styles.fallbackIconWrap}>
                <Ionicons name="construct-outline" size={28} color={colors.warn} />
              </View>
              <Text style={styles.fallbackTitle}>Requires a native build</Text>
              <Text style={styles.fallbackBody}>
                Voice logging uses the device microphone and isn't available in Expo Go. Build the app via Xcode to use this feature.
              </Text>
              <Button variant="ghost" size="lg" onPress={onClose}>
                Close
              </Button>
            </Card>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="mic-outline" size={18} color={colors.sky} />
            <Text style={styles.headerTitle}>Voice Log</Text>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={colors.fg2} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          <Card variant="promo" style={styles.heroCard}>
            <View style={styles.heroHeaderRow}>
              <Badge kind="sky" icon="mic">Voice Capture</Badge>
              <Badge kind={status === 'summary' ? 'ok' : status === 'processing' ? 'warn' : 'muted'}>
                {statusLabel}
              </Badge>
            </View>
            <Text style={styles.heroTitle}>Describe the jump once. We'll structure the whole log.</Text>
            <Text style={styles.heroBody}>
              {status === 'summary'
                ? 'Everything captured is laid out below. Review it, then send it into the manual form already filled in.'
                : 'The recorder handles the first pass, then follows up only on anything required that is still missing.'}
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Phase</Text>
                <Text style={styles.heroStatValue}>{phaseLabel}</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>Captured</Text>
                <Text style={styles.heroStatValue}>{collectedCount}/{REQUIRED_FIELDS.length}</Text>
              </View>
            </View>
            <Progress value={progressValue} color={colors.sky} height={8} />
          </Card>

          <Card variant="elevated" style={styles.promptCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Jump agent</Text>
              <Badge kind={status === 'processing' ? 'warn' : 'muted'} size="sm">
                {status === 'processing' ? 'Working' : status === 'summary' ? 'Paused' : 'Active'}
              </Badge>
            </View>
            {status === 'processing'
              ? (
                <View style={styles.processingRow}>
                  <ActivityIndicator size="small" color={colors.sky} />
                  <Text style={styles.processingText}>Figuring out what you said…</Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.agentText}>{agentText}</Text>
                  {status === 'speaking' && !isAudioReady && (
                    <View style={styles.preparingRow}>
                      <ActivityIndicator size="small" color={colors.sky} style={{ transform: [{ scale: 0.55 }] }} />
                      <Text style={styles.preparingText}>Preparing audio…</Text>
                    </View>
                  )}
                </View>
              )}
          </Card>

          {(status === 'listening' || transcript) && (
            <Card variant="elevated" style={styles.transcriptCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Live transcript</Text>
                <Badge kind={status === 'listening' ? 'sky' : 'muted'} size="sm">
                  {status === 'listening' ? 'Recording' : 'Latest pass'}
                </Badge>
              </View>
              <Text style={styles.transcriptText}>
                {transcript || 'Start speaking to see the raw transcript appear here in real time.'}
              </Text>
            </Card>
          )}

          <View style={styles.dualColumnRow}>
            <Card variant="default" style={styles.listCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Required details</Text>
                <Badge kind="sky" size="sm">{collectedCount}/{REQUIRED_FIELDS.length}</Badge>
              </View>
              <View style={styles.fieldList} key={tick}>
                {requiredFields.map(meta => {
                  const val = collected[meta.key];
                  const done = val !== undefined;
                  return (
                    <View key={meta.key} style={[styles.fieldRow, done ? styles.fieldRowDone : styles.fieldRowPending]}>
                      <View style={styles.fieldStatusIconWrap}>
                        <Ionicons
                          name={done ? 'checkmark-circle' : 'ellipse-outline'}
                          size={18}
                          color={done ? colors.ok : colors.warn}
                        />
                      </View>
                      <View style={styles.fieldContent}>
                        <Text style={styles.fieldLabel}>{meta.label}</Text>
                        <Text style={[styles.fieldValue, !done && styles.fieldValuePending]} numberOfLines={done ? 1 : 2}>
                          {done ? meta.fmt(val) : 'Still missing. The next prompt will target this if needed.'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>

            <Card variant="default" style={styles.listCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Optional details</Text>
                <Badge kind="muted" size="sm">{completedFields.length - collectedCount}/{OPTIONAL_FIELDS.length}</Badge>
              </View>
              <View style={styles.fieldList}>
                {optionalFields.map(meta => {
                  const val = collected[meta.key];
                  const done = val !== undefined;
                  return (
                    <View key={meta.key} style={[styles.fieldRow, done ? styles.fieldRowDone : styles.fieldRowOptional]}>
                      <View style={styles.fieldStatusIconWrap}>
                        <Ionicons
                          name={done ? 'sparkles' : 'add-circle-outline'}
                          size={18}
                          color={done ? colors.sky : colors.fg3}
                        />
                      </View>
                      <View style={styles.fieldContent}>
                        <Text style={styles.fieldLabel}>{meta.label}</Text>
                        <Text style={[styles.fieldValue, !done && styles.fieldValuePending]} numberOfLines={done ? 1 : 2}>
                          {done ? meta.fmt(val) : 'Optional. Add it in voice or leave it for manual edits later.'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          </View>

          {permDenied && (
            <Card variant="warning" style={styles.permCard}>
              <View style={styles.permBanner}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.warn} />
                <Text style={styles.permText}>Microphone permission denied — enable it in Settings.</Text>
              </View>
            </Card>
          )}

          {status === 'summary' && (
            <Card variant="elevated" style={styles.summaryPanel}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.summaryTitle}>Ready to fill in</Text>
                {summaryListening && (
                  <View style={styles.summaryListenPill}>
                    <ActivityIndicator size="small" color={colors.sky} style={{ transform: [{ scale: 0.65 }] }} />
                    <Text style={styles.summaryListenText}>Listening…</Text>
                  </View>
                )}
              </View>
              {summaryListening && transcript ? (
                <Text style={styles.summaryTranscript}>{transcript}</Text>
              ) : null}
              <View style={styles.summaryList}>
                {completedFields.map(meta => (
                  <View key={meta.key} style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>{meta.label}</Text>
                    <Text
                      style={[styles.summaryVal, meta.key === 'notes' && styles.summaryValNotes]}
                      numberOfLines={meta.key === 'notes' ? 0 : 2}
                    >
                      {meta.fmt(collected[meta.key])}
                    </Text>
                  </View>
                ))}
              </View>
              <Text style={styles.summaryEditNote}>You can edit any of this after saving.</Text>
            </Card>
          )}
        </ScrollView>

        {status === 'summary' ? (
          <View style={styles.summaryFooter}>
            <View style={styles.summaryBtns}>
              <Button variant="primary" size="lg" icon="checkmark" loading={saving} onPress={handleConfirm} style={styles.summaryPrimaryBtn}>
                Fill it in
              </Button>
              <Button variant="sub" size="lg" onPress={() => startConversation()} style={styles.summarySecondaryBtn}>
                Start over
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.micDockWrap}>
            <View style={styles.micDock}>
              {/* Translucent info block — title, subtitle, badge, hint */}
              <View style={styles.micDockInfo}>
                <View style={styles.micDockTop}>
                  <View>
                    <Text style={styles.micDockTitle}>Recorder</Text>
                    <Text style={styles.micDockSubtitle}>
                      {status === 'listening'
                        ? isDumpPhase ? 'Listening for the full story. Pause when you are done.' : 'Listening for the missing detail.'
                        : status === 'processing' ? 'Processing your last response.'
                        : status === 'speaking' ? (isAudioReady ? 'Question is playing now.' : 'Getting the next question ready.')
                        : 'Tap the microphone to start.'}
                    </Text>
                  </View>
                  <Badge kind={status === 'listening' ? 'sky' : status === 'processing' ? 'warn' : 'muted'}>
                    {statusLabel}
                  </Badge>
                </View>
                <Text style={styles.micHint}>
                  {status === 'listening'
                    ? isDumpPhase ? 'Listening… speak freely, then pause' : 'Listening…'
                    : status === 'processing' ? 'Processing…'
                    : status === 'speaking'   ? (isAudioReady ? 'Speaking…' : 'Preparing…')
                    : 'Tap to start recording'}
                </Text>
              </View>
              {/* Mic button — fully opaque */}
              <View style={styles.micRow}>
                <Animated.View style={[styles.micHalo, { transform: [{ scale: pulseAnim }] }]}>
                  <TouchableOpacity
                    style={[styles.micBtn, status === 'listening' && styles.micBtnActive]}
                    onPress={status === 'listening' ? stopListening : () => startListening(isDumpRef.current ? 4500 : 2500)}
                    activeOpacity={0.75}
                    disabled={status === 'processing' || status === 'speaking' || permDenied}
                  >
                    <Ionicons
                      name={status === 'listening' ? 'stop' : 'mic'}
                      size={34}
                      color={status === 'listening' ? colors.onSky : colors.sky}
                    />
                  </TouchableOpacity>
                </Animated.View>
                {status === 'listening' && (
                  <Text style={styles.stopHint}>Tap to stop early</Text>
                )}
              </View>
            </View>
          </View>
        )}

      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    scrollView: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[4],
      paddingBottom: 220,
      gap: spacing[3],
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing[5],
      paddingTop: spacing[4],
      paddingBottom: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    headerTitle: {
      fontFamily: 'InterTight-Bold',
      fontSize: 17,
      color: c.fg,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: radii.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heroCard: {
      borderRadius: radii['2xl'],
      padding: spacing[4],
      gap: spacing[3],
      ...shadows.glow,
    },
    heroHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing[2],
    },
    heroTitle: {
      fontFamily: 'InterTight-Bold',
      fontSize: 28,
      lineHeight: 31,
      color: c.fg,
      letterSpacing: -0.7,
    },
    heroBody: {
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      lineHeight: 22,
      color: c.fg2,
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[3],
    },
    heroStat: {
      flex: 1,
      gap: spacing[0.5],
    },
    heroStatLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.fg3,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    heroStatValue: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 15,
      lineHeight: 20,
      color: c.fg,
    },
    heroDivider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: c.borderStrong,
    },
    promptCard: {
      borderRadius: radii.xl,
      padding: spacing[4],
      gap: spacing[2],
    },
    dualColumnRow: {
      gap: spacing[3],
    },
    listCard: {
      borderRadius: radii.xl,
      padding: spacing[4],
      gap: spacing[3],
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing[2],
    },
    sectionTitle: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 17,
      lineHeight: 22,
      color: c.fg,
      letterSpacing: -0.3,
    },
    agentText: {
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      color: c.fg,
      lineHeight: 22,
    },
    processingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
    processingText: {
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      color: c.fg3,
    },
    preparingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      marginTop: spacing[1.5],
    },
    preparingText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.sky,
      letterSpacing: 0.5,
    },
    fieldList: {
      gap: spacing[2],
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      borderRadius: radii.lg,
      borderWidth: 1,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
    },
    fieldRowDone: {
      backgroundColor: c.surface2,
      borderColor: c.borderStrong,
    },
    fieldRowPending: {
      backgroundColor: c.warnBg,
      borderColor: c.warn,
    },
    fieldRowOptional: {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    fieldStatusIconWrap: {
      width: 20,
      alignItems: 'center',
      paddingTop: 1,
    },
    fieldContent: {
      flex: 1,
      gap: spacing[0.5],
    },
    fieldLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.fg3,
      letterSpacing: 0.8,
    },
    fieldValue: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 14,
      lineHeight: 19,
      color: c.fg,
    },
    fieldValuePending: {
      fontFamily: 'InterTight-Regular',
      color: c.fg2,
    },
    transcriptCard: {
      borderRadius: radii.xl,
      padding: spacing[4],
      gap: spacing[2],
    },
    transcriptText: {
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      color: c.fg2,
      fontStyle: 'italic',
      lineHeight: 20,
    },
    permCard: {
      borderRadius: radii.xl,
      padding: spacing[3],
    },
    permBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    permText: {
      flex: 1,
      fontFamily: 'InterTight-Regular',
      fontSize: 13,
      color: c.warn,
    },
    summaryPanel: {
      borderRadius: radii['2xl'],
      padding: spacing[4],
      gap: spacing[3],
    },
    summaryFooter: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[2],
      paddingBottom: Platform.OS === 'android' ? spacing[8] : spacing[5],
    },
    summaryTitle: {
      fontFamily: 'InterTight-Bold',
      fontSize: 18,
      color: c.fg,
      letterSpacing: -0.3,
    },
    summaryList: {
      gap: spacing[2],
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing[3],
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingBottom: spacing[2],
    },
    summaryKey: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.fg3,
      letterSpacing: 0.5,
    },
    summaryVal: {
      fontFamily: 'InterTight-Regular',
      fontSize: 13,
      color: c.fg,
      flexShrink: 1,
      textAlign: 'right',
    },
    summaryValNotes: {
      textAlign: 'right',
      flex: 1,
    },
    summaryListenPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[1],
      backgroundColor: c.skyBg,
      borderRadius: radii.pill,
      paddingHorizontal: spacing[2],
      paddingVertical: 2,
    },
    summaryListenText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      color: c.sky,
      letterSpacing: 0.5,
    },
    summaryTranscript: {
      fontFamily: 'InterTight-Regular',
      fontSize: 13,
      color: c.fg3,
      fontStyle: 'italic',
      marginTop: -spacing[1],
    },
    summaryEditNote: {
      fontFamily: 'InterTight-Regular',
      fontSize: 12,
      color: c.fg3,
      textAlign: 'center',
      marginTop: spacing[2],
      marginBottom: spacing[1],
    },
    editInline: {
      backgroundColor: c.surface2,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: c.sky,
      padding: spacing[2],
      gap: spacing[2],
      marginTop: spacing[1],
    },
    editInlineInput: {
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      color: c.fg,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingVertical: spacing[1],
    },
    editInlineBtns: {
      flexDirection: 'row',
      gap: spacing[3],
      justifyContent: 'flex-end',
    },
    editSaveBtn: {
      backgroundColor: c.sky,
      borderRadius: radii.sm,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1],
    },
    editSaveBtnText: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 12,
      color: c.onSky,
    },
    editCancelText: {
      fontFamily: 'InterTight-Regular',
      fontSize: 12,
      color: c.fg3,
      paddingVertical: spacing[1],
    },
    summaryBtns: {
      flexDirection: 'row',
      gap: spacing[3],
    },
    summaryPrimaryBtn: {
      flex: 1,
    },
    summarySecondaryBtn: {
      width: 132,
    },
    micDockWrap: {
      position: 'absolute',
      bottom: 0,
      left: spacing[4],
      right: spacing[4],
      paddingBottom: Platform.OS === 'android' ? spacing[8] : spacing[6],
    },
    micDock: {
      borderRadius: radii['2xl'],
      padding: spacing[4],
      gap: spacing[3],
      backgroundColor: c.surface + 'D9',
      borderWidth: 1,
      borderColor: c.border + '60',
      overflow: 'hidden',
    },
    micDockTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing[3],
    },
    micDockInfo: {
      opacity: 0.72,
      gap: spacing[2],
    },
    micDockTitle: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 17,
      lineHeight: 22,
      color: c.fg,
    },
    micDockSubtitle: {
      marginTop: spacing[1],
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      lineHeight: 20,
      color: c.fg2,
      maxWidth: 240,
    },
    micRow: {
      alignItems: 'center',
      gap: spacing[2],
    },
    micHint: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.8,
      color: c.fg3,
    },
    micHalo: {
      width: 116,
      height: 116,
      borderRadius: 58,
      backgroundColor: c.skyBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    micBtn: {
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: c.surface, // fully opaque — intentionally solid
      borderWidth: 2,
      borderColor: c.sky,
      justifyContent: 'center',
      alignItems: 'center',
      ...shadows.glow,
    },
    micBtnActive: { backgroundColor: c.sky, borderColor: c.sky },
    stopHint: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.6,
      color: c.fg3,
    },
    fallbackWrap: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing[5],
    },
    fallbackCard: {
      borderRadius: radii['2xl'],
      padding: spacing[5],
      gap: spacing[3],
      alignItems: 'flex-start',
    },
    fallbackIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.warnBg,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fallbackTitle: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 22,
      color: c.fg,
    },
    fallbackBody: {
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      color: c.fg3,
      lineHeight: 21,
    },
  });
}
