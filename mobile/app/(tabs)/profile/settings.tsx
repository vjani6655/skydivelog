import { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet,  TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Modal, KeyboardAvoidingView, Platform, Clipboard } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Toggle from '@/components/ui/Toggle';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { usePrefs, type AltUnit, type DateFmt, type ThemePref } from '@/lib/prefsContext';
import {
  loadNotifPrefs,
  saveNotifPref,
  registerPushToken,
  DEFAULT_PREFS,
  type NotifPrefs,
} from '@/lib/notifications';

const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://www.jumplogs.com';

const LAYOUT_JUMP_LIST = ['Timeline', 'Compact', 'Cards'];
const LAYOUT_JUMP_DETAIL = ['Standard', 'Cockpit', 'Photo-led'];
const LAYOUT_STATS = ['Cards', 'Cockpit', 'Story'];
const ALT_UNITS: AltUnit[] = ['ft', 'm'];
const DATE_FMTS: { value: DateFmt; label: string }[] = [
  { value: 'DD MMM YYYY', label: '26 May 2026' },
  { value: 'MM/DD/YYYY',  label: '05/26/2026' },
  { value: 'YYYY-MM-DD',  label: '2026-05-26' },
];
const THEMES: { value: ThemePref; label: string }[] = [
  { value: 'dark',   label: 'Dark' },
  { value: 'light',  label: 'Light' },
  { value: 'system', label: 'System' },
];

function SectionTitle({ text }: { text: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={styles.sectionTitle}>{text}</Text>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Toggle on={value} onChange={onChange} />
    </View>
  );
}

function ChipRow({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.chipRow}>
      {options.map(o => (
        <TouchableOpacity key={o} style={[styles.chip, value === o && styles.chipActive]} onPress={() => onChange(o)} activeOpacity={0.7}>
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LabeledChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <Text style={styles.subLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[styles.chip, value === o.value && styles.chipActive]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, value === o.value && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { prefs, updatePrefs } = usePrefs();
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [notifUserId, setNotifUserId] = useState<string | null>(null);
  const [currencyMonths, setCurrencyMonths] = useState(1);
  const [repackDays, setRepackDays] = useState(30);
  const [certDays, setCertDays] = useState(30);
  const [layoutList, setLayoutList] = useState('Timeline');
  const [layoutDetail, setLayoutDetail] = useState('Standard');
  const [layoutStats, setLayoutStats] = useState('Cards');
  const [sync, setSync] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Prior freefall
  const [priorFFInput, setPriorFFInput] = useState(''); // stored as "Xh Ym" display
  const [priorCanopyInput, setPriorCanopyInput] = useState('');
  const [firstJumpNumber, setFirstJumpNumber] = useState<number | null>(null);

  // Delete account state
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // 2FA state
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaModal, setMfaModal] = useState<'enroll' | 'unenroll' | null>(null);
  const [mfaQR, setMfaQR] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaNewFactorId, setMfaNewFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaWorking, setMfaWorking] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      setNotifUserId(user.id);
      const [{ data }, loadedPrefs] = await Promise.all([
        supabase.from('users').select('display_layout_jump_list, display_layout_jump_detail, display_layout_stats_overview, currency_alert_months, repack_reminder_days, cert_expiry_warning_days, prior_freefall_seconds, prior_canopy_seconds').eq('id', user.id).single(),
        loadNotifPrefs(supabase, user.id),
        registerPushToken(supabase, user.id),
      ]);
      if (data) {
        if (data.display_layout_jump_list) setLayoutList(data.display_layout_jump_list);
        if (data.display_layout_jump_detail) setLayoutDetail(data.display_layout_jump_detail);
        if (data.display_layout_stats_overview) setLayoutStats(data.display_layout_stats_overview);
        if (data.currency_alert_months != null) setCurrencyMonths(data.currency_alert_months);
        if (data.repack_reminder_days != null) setRepackDays(data.repack_reminder_days);
        if (data.cert_expiry_warning_days != null) setCertDays(data.cert_expiry_warning_days);
        // Populate prior FF display
        const secs = data.prior_freefall_seconds ?? 0;
        if (secs > 0) {
          const h = Math.floor(secs / 3600);
          const m = Math.floor((secs % 3600) / 60);
          setPriorFFInput(h > 0 ? `${h}h ${m}m` : `${m}m`);
        }
        // Populate prior canopy display
        const csecs = data.prior_canopy_seconds ?? 0;
        if (csecs > 0) {
          const ch = Math.floor(csecs / 3600);
          const cm = Math.floor((csecs % 3600) / 60);
          setPriorCanopyInput(ch > 0 ? `${ch}h ${cm}m` : `${cm}m`);
        }
      }

      // Detect whether user started mid-career (first jump number > 1)
      const { data: firstJump } = await supabase
        .from('jumps')
        .select('jump_number')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('jump_number', { ascending: true })
        .limit(1)
        .maybeSingle();
      setFirstJumpNumber(firstJump?.jump_number ?? null);
      if (loadedPrefs) setNotifPrefs(loadedPrefs);

      // Load MFA status
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      setMfaEnabled(!!totpFactor);
      setMfaFactorId(totpFactor?.id ?? null);

      setLoaded(true);
    })();
  }, []);

  const togglePref = async (key: keyof NotifPrefs, value: boolean) => {
    if (!notifUserId) return;
    setNotifPrefs(p => ({ ...p, [key]: value }));
    await saveNotifPref(supabase, notifUserId, key, value);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      // Parse prior FF input: accept "Xh Ym", "Xh", "Ym", or plain minutes
      let priorFFSecs = 0;
      const ffStr = priorFFInput.trim().toLowerCase();
      if (ffStr) {
        const hMatch = ffStr.match(/(\d+)\s*h/);
        const mMatch = ffStr.match(/(\d+)\s*m/);
        const plainMin = !hMatch && !mMatch ? parseInt(ffStr, 10) : NaN;
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const mins = mMatch ? parseInt(mMatch[1], 10) : (!isNaN(plainMin) ? plainMin : 0);
        priorFFSecs = hours * 3600 + mins * 60;
      }

      let priorCanopySecs = 0;
      const cStr = priorCanopyInput.trim().toLowerCase();
      if (cStr) {
        const hMatch = cStr.match(/(\d+)\s*h/);
        const mMatch = cStr.match(/(\d+)\s*m/);
        const plainMin = !hMatch && !mMatch ? parseInt(cStr, 10) : NaN;
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const mins = mMatch ? parseInt(mMatch[1], 10) : (!isNaN(plainMin) ? plainMin : 0);
        priorCanopySecs = hours * 3600 + mins * 60;
      }

      const { error } = await supabase.from('users').update({
        display_layout_jump_list: layoutList,
        display_layout_jump_detail: layoutDetail,
        display_layout_stats_overview: layoutStats,
        currency_alert_months: currencyMonths,
        repack_reminder_days: repackDays,
        cert_expiry_warning_days: certDays,
        prior_freefall_seconds: priorFFSecs,
        prior_canopy_seconds: priorCanopySecs,
      }).eq('id', user.id);
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;

  const startEnroll = async () => {
    setMfaCode('');
    setMfaWorking(true);
    try {
      // Clean up any existing unverified factors before re-enrolling
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = existing?.totp?.filter(f => (f.status as string) === 'unverified') ?? [];
      await Promise.all(unverified.map(f => supabase.auth.mfa.unenroll({ factorId: f.id })));

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'SkydiveLog', friendlyName: `Authenticator-${Date.now()}` });
      if (error || !data) { Alert.alert('Error', error?.message ?? 'Failed to start 2FA setup'); return; }
      setMfaQR(data.totp.uri);
      setMfaSecret(data.totp.secret);
      setMfaNewFactorId(data.id);
      // Create challenge immediately so user can verify
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: data.id });
      if (chErr || !ch) { Alert.alert('Error', chErr?.message ?? 'Failed to create challenge'); return; }
      setMfaChallengeId(ch.id);
      setMfaModal('enroll');
    } finally {
      setMfaWorking(false);
    }
  };

  const confirmEnroll = async () => {
    if (!mfaNewFactorId || !mfaChallengeId || mfaCode.length !== 6) return;
    setMfaWorking(true);
    try {
      const { error } = await supabase.auth.mfa.verify({ factorId: mfaNewFactorId, challengeId: mfaChallengeId, code: mfaCode });
      if (error) { Alert.alert('Invalid code', error.message); return; }
      setMfaEnabled(true);
      setMfaFactorId(mfaNewFactorId);
      setMfaModal(null);
      setMfaCode('');
    } finally {
      setMfaWorking(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) { setDeleteError('Password is required.'); return; }
    setDeleting(true);
    setDeleteError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setDeleteError('Not signed in.'); setDeleting(false); return; }

      const res = await fetch(`${WEB_URL}/api/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(json.error ?? 'Could not delete account. Try again.');
        setDeleting(false);
        return;
      }

      await supabase.auth.signOut();
      router.replace('/welcome');
    } catch {
      setDeleteError('Something went wrong. Try again.');
    } finally {
      setDeleting(false);
    }
  };

  const startUnenroll = () => {
    Alert.alert('Disable 2FA', 'This will remove two-factor authentication from your account. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: confirmUnenroll },
    ]);
  };

  const confirmUnenroll = async () => {
    if (!mfaFactorId) return;
    setMfaWorking(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) { Alert.alert('Error', error.message); return; }
      setMfaEnabled(false);
      setMfaFactorId(null);
    } finally {
      setMfaWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SectionTitle text="NOTIFICATIONS" />
        <View style={styles.card}>
          <ToggleRow label="Jump logged confirmation" value={notifPrefs.jump_logged} onChange={v => togglePref('jump_logged', v)} />
          <View style={styles.rowDivider} />
          <ToggleRow label="Weekly recap" value={notifPrefs.weekly_recap} onChange={v => togglePref('weekly_recap', v)} />
          <View style={styles.rowDivider} />
          <ToggleRow label="App announcements" value={notifPrefs.announcements} onChange={v => togglePref('announcements', v)} />
          <View style={styles.rowDivider} />
          <ToggleRow label="Currency alerts" value={notifPrefs.currency_alert} onChange={v => togglePref('currency_alert', v)} />
          <View style={styles.threshRow}>
            <Text style={styles.threshLabel}>ALERT WINDOW</Text>
            <View style={styles.threshChips}>
              {[1, 2, 3, 6, 12].map(m => (
                <TouchableOpacity key={m} style={[styles.chip, currencyMonths === m && styles.chipActive]} onPress={() => setCurrencyMonths(m)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, currencyMonths === m && styles.chipTextActive]}>{m === 12 ? '1yr' : `${m}mo`}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.rowDivider} />
          <ToggleRow label="Repack reminders" value={notifPrefs.repack_due} onChange={v => togglePref('repack_due', v)} />
          <View style={styles.threshRow}>
            <Text style={styles.threshLabel}>DAYS BEFORE</Text>
            <View style={styles.threshChips}>
              {[7, 14, 30, 60].map(d => (
                <TouchableOpacity key={d} style={[styles.chip, repackDays === d && styles.chipActive]} onPress={() => setRepackDays(d)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, repackDays === d && styles.chipTextActive]}>{d}d</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.rowDivider} />
          <ToggleRow label="Cert expiry warnings" value={notifPrefs.cert_expiry} onChange={v => togglePref('cert_expiry', v)} />
          <View style={styles.threshRow}>
            <Text style={styles.threshLabel}>DAYS BEFORE</Text>
            <View style={styles.threshChips}>
              {[7, 14, 30, 60].map(d => (
                <TouchableOpacity key={d} style={[styles.chip, certDays === d && styles.chipActive]} onPress={() => setCertDays(d)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, certDays === d && styles.chipTextActive]}>{d}d</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <SectionTitle text="DISPLAY" />
        <View style={styles.card}>
          <LabeledChipRow
            label="THEME"
            options={THEMES}
            value={prefs.theme}
            onChange={v => updatePrefs({ theme: v })}
          />
          <View style={styles.rowDivider} />
          <LabeledChipRow
            label="ALTITUDE UNIT"
            options={ALT_UNITS.map(u => ({ value: u, label: u === 'ft' ? 'Feet (ft)' : 'Metres (m)' }))}
            value={prefs.altUnit}
            onChange={v => updatePrefs({ altUnit: v })}
          />
          <View style={styles.rowDivider} />
          <LabeledChipRow
            label="DATE FORMAT"
            options={DATE_FMTS}
            value={prefs.dateFormat}
            onChange={v => updatePrefs({ dateFormat: v })}
          />
        </View>

        <SectionTitle text="DISPLAY LAYOUTS" />
        <View style={styles.card}>
          <Text style={styles.subLabel}>Jump list</Text>
          <ChipRow options={LAYOUT_JUMP_LIST} value={layoutList} onChange={setLayoutList} />
          <View style={styles.rowDivider} />
          <Text style={styles.subLabel}>Jump detail</Text>
          <ChipRow options={LAYOUT_JUMP_DETAIL} value={layoutDetail} onChange={setLayoutDetail} />
          <View style={styles.rowDivider} />
          <Text style={styles.subLabel}>Stats</Text>
          <ChipRow options={LAYOUT_STATS} value={layoutStats} onChange={setLayoutStats} />
        </View>

        <SectionTitle text="DATA" />
        <View style={styles.card}>
          <ToggleRow label="Sync to cloud" value={sync} onChange={setSync} />
        </View>

        {/* Prior freefall — shown for everyone; especially useful for mid-career starters */}
        <SectionTitle text="CAREER HISTORY" />
        <View style={styles.card}>
          <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
            {firstJumpNumber != null && firstJumpNumber > 1 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.skyBg, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2], marginBottom: spacing[3] }}>
                <Ionicons name="information-circle-outline" size={14} color={colors.sky} style={{ marginRight: spacing[2] }} />
                <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.sky, flex: 1 }}>
                  Your first logged jump is #{firstJumpNumber}. Enter your pre-app freefall time below to see your true career total.
                </Text>
              </View>
            )}
            <Text style={[styles.subLabel, { paddingHorizontal: 0, paddingTop: 0 }]}>FREEFALL TIME BEFORE THIS APP</Text>
            <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg3, marginBottom: spacing[2], marginTop: spacing[1] }}>
              Enter time as "2h 30m", "45m", or leave blank if you started from jump #1.
            </Text>
            <TextInput
              style={[styles.chip, { borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: colors.fg, minWidth: 120 }]}
              value={priorFFInput}
              onChangeText={setPriorFFInput}
              placeholder="e.g. 1h 20m"
              placeholderTextColor={colors.fg3}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ height: spacing[4] }} />
            <Text style={[styles.subLabel, { paddingHorizontal: 0, paddingTop: 0 }]}>CANOPY TIME BEFORE THIS APP</Text>
            <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg3, marginBottom: spacing[2], marginTop: spacing[1] }}>
              Total time under canopy before you started logging here.
            </Text>
            <TextInput
              style={[styles.chip, { borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5], fontFamily: 'JetBrainsMono-Regular', fontSize: 14, color: colors.fg, minWidth: 120 }]}
              value={priorCanopyInput}
              onChangeText={setPriorCanopyInput}
              placeholder="e.g. 8h 30m"
              placeholderTextColor={colors.fg3}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <SectionTitle text="SECURITY" />
        <View style={[styles.card, mfaEnabled && { borderColor: colors.ok + '60', backgroundColor: colors.okBg }]}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Two-Factor Authentication</Text>
              <Text style={styles.subLabel}>
                {mfaEnabled ? 'Enabled · Authenticator app' : 'Add extra security to your account'}
              </Text>
            </View>
            {mfaWorking
              ? <ActivityIndicator size="small" color={colors.sky} />
              : mfaEnabled
                ? <TouchableOpacity onPress={startUnenroll} style={styles.mfaDisableBtn} activeOpacity={0.7}>
                    <Text style={styles.mfaDisableBtnText}>Disable</Text>
                  </TouchableOpacity>
                : <TouchableOpacity onPress={startEnroll} style={styles.mfaEnableBtn} activeOpacity={0.7}>
                    <Text style={styles.mfaEnableBtnText}>Enable</Text>
                  </TouchableOpacity>
            }
          </View>
        </View>

        <SectionTitle text="DANGER ZONE" />
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert(
              'Export your jumps first',
              'When you delete your account, all your jump data is permanently wiped and cannot be recovered.\n\nWe strongly recommend exporting your logbook before you continue.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Export My Jumps', onPress: () => router.push('/(tabs)/profile/export' as any) },
                { text: 'Delete Anyway', style: 'destructive', onPress: () => { setDeletePassword(''); setDeleteError(''); setDeleteModal(true); } },
              ]
            );
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} style={{ marginRight: spacing[2] }} />
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>

        {/* 2FA enroll modal */}
        <Modal visible={mfaModal === 'enroll'} animationType="slide" transparent onRequestClose={() => setMfaModal(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setMfaModal(null)} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Set up 2FA</Text>
                <View style={{ width: 60 }} />
              </View>
              <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalStep}>1. Scan this QR code with your authenticator app</Text>
                {mfaQR ? (
                  <View style={styles.qrWrapper}>
                    <QRCode value={mfaQR} size={200} backgroundColor="white" color="black" />
                  </View>
                ) : null}
                <Text style={styles.modalStep}>Or enter this key manually:</Text>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(mfaSecret ?? '');
                    Alert.alert('Copied', 'Secret key copied to clipboard.');
                  }}
                  activeOpacity={0.7}
                  style={styles.mfaSecretRow}
                >
                  <Text style={styles.mfaSecret} selectable>{mfaSecret ?? ''}</Text>
                  <Ionicons name="copy-outline" size={16} color={colors.sky} style={{ marginLeft: spacing[2] }} />
                </TouchableOpacity>
                <Text style={[styles.modalStep, { marginTop: spacing[5] }]}>2. Enter the 6-digit code from the app</Text>
                <TextInput
                  style={styles.codeInput}
                  value={mfaCode}
                  onChangeText={t => setMfaCode(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  placeholderTextColor={colors.fg3}
                  textAlign="center"
                />
                <TouchableOpacity
                  style={[styles.confirmBtn, (mfaCode.length !== 6 || mfaWorking) && styles.confirmBtnDisabled]}
                  onPress={confirmEnroll}
                  disabled={mfaCode.length !== 6 || mfaWorking}
                  activeOpacity={0.8}
                >
                  {mfaWorking
                    ? <ActivityIndicator color="white" />
                    : <Text style={styles.confirmBtnText}>Verify &amp; Enable</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Delete account modal */}
        <Modal visible={deleteModal} animationType="slide" transparent onRequestClose={() => setDeleteModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setDeleteModal(false)} style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <View style={{ width: 60 }} />
              </View>
              <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 14, color: colors.fg2, marginBottom: spacing[4], lineHeight: 20 }}>
                  This will permanently delete your account and all your jump data. This action cannot be undone.
                </Text>
                <Text style={styles.modalStep}>Enter your password to confirm</Text>
                <TextInput
                  style={[styles.codeInput, { letterSpacing: 0, fontSize: 16, height: 48, marginBottom: spacing[3], paddingHorizontal: spacing[3], textAlign: 'left' }]}
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  placeholder="Password"
                  placeholderTextColor={colors.fg3}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {!!deleteError && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] }}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.danger} style={{ marginRight: spacing[1] }} />
                    <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.danger }}>{deleteError}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.confirmBtn, { backgroundColor: colors.danger }, (!deletePassword.trim() || deleting) && styles.confirmBtnDisabled]}
                  onPress={handleDeleteAccount}
                  disabled={!deletePassword.trim() || deleting}
                  activeOpacity={0.8}
                >
                  {deleting ? (
                  <View style={{ alignItems: 'center', gap: spacing[2] }}>
                    <ActivityIndicator color="white" />
                    <Text style={[styles.confirmBtnText, { fontSize: 12, opacity: 0.85 }]}>
                      Preparing your export…
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.confirmBtnText}>Delete My Account</Text>
                )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[2], marginTop: spacing[4] },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, overflow: 'hidden', paddingVertical: spacing[1] },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  toggleLabel: { fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg },
  rowDivider: { height: 1, backgroundColor: c.border, marginLeft: spacing[4] },
  subLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.5, color: c.fg3, paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[3] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radii.md, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
  chipActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.1)' },
  chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
  chipTextActive: { color: c.sky },
  threshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  threshLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.5, color: c.fg3 },
  threshChips: { flexDirection: 'row', gap: spacing[2] },
  mfaEnableBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.sm, backgroundColor: c.skyBg, borderWidth: 1, borderColor: c.sky + '40' },
  mfaEnableBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.sky },
  mfaDisableBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.sm, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border },
  mfaDisableBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg3 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: c.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  modalCancelBtn: { minWidth: 60 },
  modalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2 },
  modalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
  modalBody: { padding: spacing[5], paddingBottom: 40 },
  modalStep: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg2, marginBottom: spacing[3] },
  qrWrapper: { alignItems: 'center', padding: spacing[4], backgroundColor: 'white', borderRadius: radii.lg, marginBottom: spacing[4], alignSelf: 'center' },
  mfaSecretRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface2, borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[3] },
  mfaSecret: { flex: 1, fontFamily: 'JetBrainsMono-Regular', fontSize: 13, color: c.sky, letterSpacing: 1, textAlign: 'center' },
  codeInput: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, height: 56, fontSize: 28, fontFamily: 'JetBrainsMono-Regular', color: c.fg, letterSpacing: 8, marginBottom: spacing[5] },
  confirmBtn: { backgroundColor: c.sky, borderRadius: radii.md, height: 50, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: 'white' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[3.5], borderRadius: radii.md, borderWidth: 1, borderColor: c.danger + '40', backgroundColor: c.dangerBg, marginBottom: spacing[4] },
  deleteBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.danger },
  });
}
