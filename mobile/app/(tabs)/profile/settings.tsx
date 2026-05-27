import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toggle from '@/components/ui/Toggle';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { usePrefs, type AltUnit, type DateFmt, type ThemePref } from '@/lib/prefsContext';

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
  const [currencyAlerts, setCurrencyAlerts] = useState(true);
  const [currencyMonths, setCurrencyMonths] = useState(1);
  const [repackReminders, setRepackReminders] = useState(true);
  const [repackDays, setRepackDays] = useState(30);
  const [certExpiry, setCertExpiry] = useState(true);
  const [certDays, setCertDays] = useState(30);
  const [layoutList, setLayoutList] = useState('Timeline');
  const [layoutDetail, setLayoutDetail] = useState('Standard');
  const [layoutStats, setLayoutStats] = useState('Cards');
  const [sync, setSync] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { data } = await supabase.from('users').select('display_layout_jump_list, display_layout_jump_detail, display_layout_stats_overview, currency_alert_months, repack_reminder_days, cert_expiry_warning_days').eq('id', user.id).single();
      if (data) {
        if (data.display_layout_jump_list) setLayoutList(data.display_layout_jump_list);
        if (data.display_layout_jump_detail) setLayoutDetail(data.display_layout_jump_detail);
        if (data.display_layout_stats_overview) setLayoutStats(data.display_layout_stats_overview);
        if (data.currency_alert_months != null) setCurrencyMonths(data.currency_alert_months);
        if (data.repack_reminder_days != null) setRepackDays(data.repack_reminder_days);
        if (data.cert_expiry_warning_days != null) setCertDays(data.cert_expiry_warning_days);
      }
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const { error } = await supabase.from('users').update({
        display_layout_jump_list: layoutList,
        display_layout_jump_detail: layoutDetail,
        display_layout_stats_overview: layoutStats,
        currency_alert_months: currencyMonths,
        repack_reminder_days: repackDays,
        cert_expiry_warning_days: certDays,
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <SectionTitle text="NOTIFICATIONS" />
        <View style={styles.card}>
          <ToggleRow label="Currency alerts" value={currencyAlerts} onChange={setCurrencyAlerts} />
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
          <ToggleRow label="Repack reminders" value={repackReminders} onChange={setRepackReminders} />
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
          <ToggleRow label="Cert expiry warnings" value={certExpiry} onChange={setCertExpiry} />
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
      </ScrollView>
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
  });
}
