import { useCallback, useRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { PanResponder } from 'react-native';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const CANVAS_W = 320;
const CANVAS_H = 180;

const ROLES = ['CI', 'DZSO', 'Instructor', 'Coach'] as const;
type Role = typeof ROLES[number];

function Label({ text, optional }: { text: string; optional?: boolean }) {
  const colors = useColors();
  return (
    <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>
      {text}{optional ? ' — optional' : ''}
    </Text>
  );
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function SignoffNewScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [jumpNumber, setJumpNumber] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const today = useMemo(() => new Date(), []);

  const [signerName, setSignerName] = useState('');
  const [description, setDescription] = useState('');
  const [comments, setComments] = useState('');
  const [signerRole, setSignerRole] = useState<Role | null>(null);
  const [signerLicence, setSignerLicence] = useState('');
  const [sigPaths, setSigPaths] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Signature state
  const allPaths = useRef<string[]>([]);
  const currentPath = useRef('');
  const [sigTick, setSigTick] = useState(0);
  const sigLayout = useRef({ width: CANVAS_W, height: CANVAS_H });

  const sigPan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (e) => {
      setScrollEnabled(false);
      const l = sigLayout.current;
      const nx = (e.nativeEvent.locationX / l.width) * CANVAS_W;
      const ny = (e.nativeEvent.locationY / l.height) * CANVAS_H;
      currentPath.current = `M ${nx.toFixed(1)} ${ny.toFixed(1)}`;
      setSigTick(t => t + 1);
    },
    onPanResponderMove: (e) => {
      const l = sigLayout.current;
      const nx = (e.nativeEvent.locationX / l.width) * CANVAS_W;
      const ny = (e.nativeEvent.locationY / l.height) * CANVAS_H;
      currentPath.current += ` L ${nx.toFixed(1)} ${ny.toFixed(1)}`;
      setSigTick(t => t + 1);
    },
    onPanResponderRelease: () => {
      setScrollEnabled(true);
      if (currentPath.current) {
        allPaths.current = [...allPaths.current, currentPath.current];
        setSigPaths([...allPaths.current]);
        currentPath.current = '';
        setSigTick(t => t + 1);
      }
    },
  })).current;

  const clearSig = () => {
    allPaths.current = [];
    currentPath.current = '';
    setSigPaths([]);
    setSigTick(t => t + 1);
  };

  // Suppress unused warning — sigTick drives re-render of sig canvas
  void sigTick;

  useFocusEffect(useCallback(() => {
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [{ data: profile }, { data: lastJump }] = await Promise.all([
        supabase.from('users').select('full_name').eq('id', user.id).single(),
        supabase.from('jumps')
          .select('jump_number')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('jump_number', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setUserName(profile?.full_name ?? '');
      setJumpNumber(lastJump?.jump_number ?? null);
      setLoading(false);
    })();
  }, []));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!signerName.trim()) errs.signerName = 'Required';
    if (!description.trim()) errs.description = 'Required';
    if (sigPaths.length === 0) errs.signature = 'Signature is required';
    if (!signerRole) errs.signerRole = 'Select a role';
    if (!signerLicence.trim()) errs.signerLicence = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from('signoffs').insert({
        user_id: user.id,
        jump_number: jumpNumber ?? 0,
        signoff_date: today.toISOString().split('T')[0],
        user_display_name: userName,
        description: description.trim(),
        comments: comments.trim() || null,
        signer_name: signerName.trim(),
        signer_role: signerRole!,
        signer_licence: signerLicence.trim() || null,
        signature_data: sigPaths.join(' '),
      });
      if (error) { Alert.alert('Error', error.message); return; }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.sky} />
      </View>
    );
  }

  const sigIsEmpty = allPaths.current.length === 0 && !currentPath.current;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerClose} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New sign-off</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving
            ? <ActivityIndicator size="small" color={colors.sky} />
            : <Text style={styles.saveBtn}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >

          {/* Statement card */}
          <View style={styles.statementCard}>
            <Text style={styles.statementLine}>
              {'As of '}
              <Text style={styles.statementBold}>{jumpNumber != null ? `${jumpNumber} jumps` : '— jumps'}</Text>
              {' on '}
              <Text style={styles.statementBold}>{fmtDate(today)}</Text>
            </Text>

            <View style={styles.statementRow}>
              <Text style={styles.statementLabel}>I</Text>
              <TextInput
                style={[styles.statementInput, !!errors.signerName && styles.statementInputError]}
                value={signerName}
                onChangeText={v => { setSignerName(v); setErrors(e => ({ ...e, signerName: '' })); }}
                placeholder="signer's full name"
                placeholderTextColor={colors.fg3}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            {errors.signerName ? <Text style={styles.stmtError}>{errors.signerName}</Text> : null}

            <Text style={styles.statementLine}>
              {'am signing off '}
              <Text style={styles.statementBold}>{userName || '—'}</Text>
              {' to:'}
            </Text>

            <TextInput
              style={[styles.statementDesc, !!errors.description && { borderColor: colors.danger }]}
              value={description}
              onChangeText={v => { setDescription(v); setErrors(e => ({ ...e, description: '' })); }}
              placeholder="e.g. conduct night jumps"
              placeholderTextColor={colors.fg3}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
            {errors.description ? <Text style={styles.stmtError}>{errors.description}</Text> : null}
          </View>

          {/* Additional comments */}
          <Label text="ADDITIONAL COMMENTS" optional />
          <TextInput
            style={[styles.input, styles.textarea]}
            value={comments}
            onChangeText={setComments}
            placeholder="Any additional notes or conditions…"
            placeholderTextColor={colors.fg3}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Signature */}
          <Label text="SIGNATURE" />
          {errors.signature ? <Text style={[styles.fieldError, { marginBottom: spacing[2] }]}>{errors.signature}</Text> : null}
          <View style={[styles.sigPad, !!errors.signature && { borderColor: colors.danger }]}>
            <View
              style={styles.sigCanvas}
              {...sigPan.panHandlers}
              onLayout={e => {
                sigLayout.current = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
              }}
            >
              <Svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} style={StyleSheet.absoluteFill}>
                {allPaths.current.map((d, i) => (
                  <Path key={i} d={d} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ))}
                {currentPath.current ? (
                  <Path d={currentPath.current} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : null}
              </Svg>
              {sigIsEmpty && (
                <View style={styles.sigPlaceholder} pointerEvents="none">
                  <Text style={styles.sigPlaceholderText}>Sign here</Text>
                </View>
              )}
            </View>
            <View style={styles.sigFooter}>
              <Text style={styles.sigHint}>SIGNER'S SIGNATURE</Text>
              <TouchableOpacity onPress={clearSig} activeOpacity={0.7}>
                <Text style={styles.sigClear}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Signed by role */}
          <Label text="SIGNED BY ROLE" />
          {errors.signerRole ? <Text style={[styles.fieldError, { marginBottom: spacing[2] }]}>{errors.signerRole}</Text> : null}
          <View style={styles.chipRow}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, signerRole === r && styles.chipActive]}
                onPress={() => { setSignerRole(r); setErrors(e => ({ ...e, signerRole: '' })); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, signerRole === r && styles.chipTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Licence number */}
          <Label text="LICENCE NUMBER" />
          <TextInput
            style={[styles.input, !!errors.signerLicence && styles.inputError]}
            value={signerLicence}
            onChangeText={v => { setSignerLicence(v); setErrors(e => ({ ...e, signerLicence: '' })); }}
            placeholder="e.g. CI-1234"
            placeholderTextColor={colors.fg3}
            autoCapitalize="characters"
            autoCorrect={false}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150)}
          />
          {errors.signerLicence ? <Text style={styles.fieldError}>{errors.signerLicence}</Text> : null}

          <View style={{ height: spacing[6] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    header: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing[5], paddingVertical: spacing[3],
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerClose: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
    saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky, width: 36, textAlign: 'right' },
    body: { padding: spacing[5], paddingBottom: spacing[8] },

    // Statement card
    statementCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.lg,
      padding: spacing[4],
      marginBottom: spacing[4],
      gap: spacing[3],
    },
    statementLine: {
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      color: c.fg2,
      lineHeight: 22,
    },
    statementBold: {
      fontFamily: 'InterTight-SemiBold',
      color: c.fg,
    },
    statementRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing[2],
    },
    statementLabel: {
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      color: c.fg2,
    },
    statementInput: {
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      fontFamily: 'InterTight-Medium',
      fontSize: 15,
      color: c.fg,
      paddingVertical: spacing[1],
    },
    statementInputError: { borderBottomColor: c.danger },
    statementDesc: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.base,
      padding: spacing[3],
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      color: c.fg,
      minHeight: 80,
    },
    stmtError: {
      fontFamily: 'InterTight-Regular',
      fontSize: 12,
      color: c.danger,
      marginTop: -spacing[2],
    },

    // Standard inputs
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
      marginBottom: spacing[4],
      fontFamily: 'InterTight-Regular',
      fontSize: 15,
      color: c.fg,
    },
    inputError: { borderColor: c.danger, marginBottom: spacing[1] },
    textarea: { minHeight: 80, paddingTop: spacing[3] },
    fieldError: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.danger, marginBottom: spacing[3] },

    // Signature pad
    sigPad: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.lg,
      overflow: 'hidden',
      marginBottom: spacing[4],
    },
    sigCanvas: { height: 180, position: 'relative' },
    sigPlaceholder: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
    sigPlaceholderText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg3 },
    sigFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    sigHint: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3 },
    sigClear: { fontFamily: 'InterTight-Regular', fontSize: 13, color: c.fg2 },

    // Role chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[4] },
    chip: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[2],
      borderRadius: radii.pill,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipActive: { backgroundColor: c.sky, borderColor: c.sky },
    chipText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg2 },
    chipTextActive: { color: c.onSky },
  });
}
