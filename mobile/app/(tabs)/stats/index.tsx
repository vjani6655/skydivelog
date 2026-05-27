import { useCallback, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { JumpFull } from '@/lib/types';

type StatsLayout = 'Cards' | 'Cockpit' | 'Story';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtHM(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function fmtHMColon(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

function daysSinceLastJump(jumps: JumpFull[]): number {
  if (!jumps.length) return 999;
  const lastDate = new Date(jumps[0].date);
  const today = new Date();
  return Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
}

// ─── Chart primitives ─────────────────────────────────────────────────────────

function SparklineRN({ data }: { data: number[] }) {
  const colors = useColors();
  const sparkStyles = useMemo(() => makeSparkStyles(colors), [colors]);
  const max = Math.max(...data, 1);
  return (
    <View style={sparkStyles.row}>
      {data.map((v, i) => (
        <View key={i} style={sparkStyles.barCol}>
          <View style={[sparkStyles.bar, { flex: v / max }]} />
          <View style={{ flex: 1 - v / max }} />
        </View>
      ))}
    </View>
  );
}

function makeSparkStyles(c: ColorSet) {
  return StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', height: 48, width: 110, gap: 2 },
  barCol: { flex: 1, flexDirection: 'column', height: '100%' },
  bar: { borderRadius: 2, backgroundColor: c.sky, opacity: 0.8 },
  });
}

function BarChartRN({ data }: { data: { label: string; v: number; highlight?: boolean }[] }) {
  const colors = useColors();
  const barStyles = useMemo(() => makeBarStyles(colors), [colors]);
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <View style={barStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={barStyles.col}>
          <View style={barStyles.barWrap}>
            <View style={[barStyles.bar, { flex: d.v / max, backgroundColor: d.highlight ? colors.sky : colors.surface2 }]} />
            <View style={{ flex: 1 - d.v / max }} />
          </View>
          <Text style={barStyles.label}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

function makeBarStyles(c: ColorSet) {
  return StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  col: { flex: 1, flexDirection: 'column', alignItems: 'center', height: '100%' },
  barWrap: { flex: 1, width: '100%', flexDirection: 'column' },
  bar: { borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.fg3, marginTop: 3 },
  });
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  const colors = useColors();
  const progressStyles = useMemo(() => makeProgressStyles(colors), [colors]);
  return (
    <View style={progressStyles.track}>
      <View style={[progressStyles.fill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: color }]} />
    </View>
  );
}

function makeProgressStyles(c: ColorSet) {
  return StyleSheet.create({
  track: { height: 4, borderRadius: 2, backgroundColor: c.surface2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  });
}

// ─── Stats data bag ───────────────────────────────────────────────────────────

interface StatsBag {
  totalJumps: number;
  totalFFSecs: number;
  totalCanopySecs: number;
  avgFFSecs: number;
  daysSinceLast: number;
  currencyDays: number;
  monthlySparkline: number[];
  typeBreakdown: { type: string; count: number; pct: number }[];
  weeklyCounts: { label: string; v: number; highlight?: boolean }[];
  topDZ: string;
  thisYear: number;
}

// ─── StatsA (Cards) ──────────────────────────────────────────────────────────

function StatsA({ s }: { s: StatsBag }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isCurrent = s.daysSinceLast <= s.currencyDays;
  const TYPE_COLORS = [colors.sky, '#34D2D6', colors.warn, '#A78BFA'];

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Stats</Text>
          <Text style={styles.screenSub}>ALL TIME</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Total jumps</Text>
            <Text style={styles.heroNum}>{s.totalJumps}</Text>
            <View style={styles.inlineRow}>
              <Ionicons name="trending-up" size={12} color={colors.ok} />
              <Text style={styles.trendText}>+{s.monthlySparkline[s.monthlySparkline.length - 1] ?? 0} this month</Text>
            </View>
          </View>
          <SparklineRN data={s.monthlySparkline} />
        </View>
      </View>

      <View style={styles.row2}>
        <View style={[styles.card, styles.flex]}>
          <Text style={styles.label}>Freefall</Text>
          <Text style={styles.monoMd}>{fmtHM(s.totalFFSecs)}</Text>
          <Text style={styles.labelSm}>{s.totalFFSecs}s · avg {s.avgFFSecs}s</Text>
        </View>
        <View style={[styles.card, styles.flex]}>
          <Text style={styles.label}>Canopy</Text>
          <Text style={styles.monoMd}>{fmtHM(s.totalCanopySecs)}</Text>
          <Text style={styles.labelSm}>avg {fmtHMColon(Math.round(s.totalCanopySecs / Math.max(s.totalJumps, 1)))}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Currency</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fg, { fontFamily: 'InterTight-SemiBold', fontSize: 14 }]}>
              {isCurrent ? "You're current" : 'Not current'}
            </Text>
            <Text style={styles.labelSm}>{s.currencyDays}-day window</Text>
          </View>
          <View style={[styles.badge, isCurrent ? styles.badgeOk : styles.badgeDanger]}>
            <Text style={[styles.badgeText, { color: isCurrent ? colors.ok : colors.danger }]}>
              {isCurrent ? 'CURRENT' : 'LAPSED'}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.rowBetween}>
          <Text style={styles.labelSm}>Last jump · {s.daysSinceLast}d ago</Text>
          <Text style={styles.labelSm}>{isCurrent ? `${s.currencyDays - s.daysSinceLast} days left` : 'Log a jump'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>By jump type</Text>
      <View style={styles.card}>
        {s.typeBreakdown.map(({ type, count, pct }, i) => (
          <View key={type} style={[styles.typeRow, i < s.typeBreakdown.length - 1 && styles.typeRowBorder]}>
            <View style={styles.rowBetween}>
              <Text style={styles.typeName}>{type}</Text>
              <Text style={styles.typeCount}>{count} <Text style={styles.typePct}>· {pct}%</Text></Text>
            </View>
            <View style={{ marginTop: spacing[2] }}>
              <ProgressBar pct={pct} color={TYPE_COLORS[i % TYPE_COLORS.length]} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── StatsB (Cockpit) ─────────────────────────────────────────────────────────

function StatsB({ s }: { s: StatsBag }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const currencyBarStyles = useMemo(() => makeCurrencyBarStyles(colors), [colors]);
  const isCurrent = s.daysSinceLast <= s.currencyDays;
  const currencyPct = Math.max(0, Math.round(((s.currencyDays - s.daysSinceLast) / s.currencyDays) * 100));

  return (
    <ScrollView contentContainerStyle={styles.body}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.screenTitle}>Stats</Text>
          <Text style={styles.screenSub}>LIFETIME</Text>
        </View>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroGaugeLabel}>TOTAL JUMPS</Text>
        <Text style={styles.heroGaugeNum}>{s.totalJumps}</Text>
        <Text style={styles.heroGaugeSub}>NEXT: {Math.ceil(s.totalJumps / 100) * 100 - s.totalJumps} TO {Math.ceil(s.totalJumps / 100) * 100}</Text>
      </View>

      <View style={styles.row2}>
        <View style={[styles.card, styles.flex]}>
          <Text style={styles.telLabel}>FREEFALL</Text>
          <Text style={styles.telValue}>{fmtHMColon(s.totalFFSecs)}</Text>
          <Text style={styles.telUnit}>h:m</Text>
        </View>
        <View style={[styles.card, styles.flex]}>
          <Text style={styles.telLabel}>CANOPY</Text>
          <Text style={styles.telValue}>{fmtHMColon(s.totalCanopySecs)}</Text>
          <Text style={styles.telUnit}>h:m</Text>
        </View>
      </View>
      <View style={styles.row2}>
        <View style={[styles.card, styles.flex]}>
          <Text style={styles.telLabel}>AVG FF</Text>
          <Text style={styles.telValue}>{s.avgFFSecs}</Text>
          <Text style={styles.telUnit}>s</Text>
        </View>
        <View style={[styles.card, styles.flex]}>
          <Text style={styles.telLabel}>TYPES LOGGED</Text>
          <Text style={styles.telValue}>{s.typeBreakdown.length}</Text>
          <Text style={styles.telUnit}>types</Text>
        </View>
      </View>

      <View style={[styles.card, { marginBottom: spacing[3] }]}>
        <View style={[styles.rowBetween, { marginBottom: spacing[3] }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.telLabel}>CURRENCY · {s.currencyDays}D</Text>
            <Text style={[styles.fg, { fontFamily: 'InterTight-SemiBold', fontSize: 18, marginTop: 4 }]}>
              {isCurrent ? 'Current' : 'Lapsed'}
            </Text>
          </View>
          <View style={[styles.badge, isCurrent ? styles.badgeOk : styles.badgeDanger]}>
            <Text style={[styles.badgeText, { color: isCurrent ? colors.ok : colors.danger }]}>
              {isCurrent ? 'OK' : 'LAPSED'}
            </Text>
          </View>
        </View>
        <View style={currencyBarStyles.track}>
          <View style={[currencyBarStyles.fill, { width: `${currencyPct}%` as any }]} />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.labelSm}>NOW</Text>
          <Text style={styles.labelSm}>{isCurrent ? `+${30 - s.daysSinceLast}D` : '+0D'}</Text>
          <Text style={styles.labelSm}>+30D LAPSE</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.telLabel}>LAST 30 DAYS</Text>
        <View style={{ marginTop: spacing[3] }}>
          <BarChartRN data={s.weeklyCounts} />
        </View>
      </View>
    </ScrollView>
  );
}

function makeCurrencyBarStyles(c: ColorSet) {
  return StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: c.surface2, marginBottom: spacing[2], overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: c.ok },
  });
}

// ─── StatsC (Story) ───────────────────────────────────────────────────────────

function StatsC({ s }: { s: StatsBag }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const storyCardStyles = useMemo(() => makeStoryCardStyles(colors), [colors]);
  const heroBannerStyles = useMemo(() => makeHeroBannerStyles(colors), [colors]);
  const isCurrent = s.daysSinceLast <= s.currencyDays;
  const thisYear = new Date().getFullYear();

  return (
    <ScrollView>
      <View style={heroBannerStyles.hero}>
        <View style={heroBannerStyles.overlay} />
        <View style={heroBannerStyles.topRow}>
          <Text style={heroBannerStyles.yearLabel}>YOUR YEAR · {thisYear}</Text>
        </View>
        <View style={heroBannerStyles.bottom}>
          <Text style={heroBannerStyles.bigNum}>{s.thisYear}</Text>
          <Text style={heroBannerStyles.bigSub}>jumps so far · on pace for {Math.round(s.thisYear / Math.max(new Date().getMonth() + 1, 1) * 12)}</Text>
        </View>
      </View>

      <View style={{ padding: spacing[5] }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[4] }}>
          {[
            { label: 'Total', value: String(s.totalJumps), sub: 'all time' },
            { label: 'Freefall', value: fmtHM(s.totalFFSecs), sub: 'total' },
            { label: 'Avg FF', value: s.avgFFSecs + 's', sub: 'per jump' },
            { label: 'Top DZ', value: s.topDZ || '—', sub: 'most visited' },
          ].map(({ label, value, sub }) => (
            <View key={label} style={storyCardStyles.card}>
              <Text style={styles.label}>{label}</Text>
              <Text style={storyCardStyles.value}>{value}</Text>
              <Text style={styles.labelSm}>{sub}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.card}>
          <View style={[styles.rowBetween, { marginBottom: spacing[3] }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Currency · {s.currencyDays}d</Text>
              <Text style={[styles.fg, { fontFamily: 'InterTight-SemiBold', fontSize: 16, marginTop: 2 }]}>
                {isCurrent ? "You're current" : 'Not current'}
              </Text>
            </View>
            <View style={[styles.badge, isCurrent ? styles.badgeOk : styles.badgeDanger]}>
              <Text style={[styles.badgeText, { color: isCurrent ? colors.ok : colors.danger }]}>
                {isCurrent ? 'OK' : 'LAPSED'}
              </Text>
            </View>
          </View>
          <Text style={styles.labelSm}>
            {isCurrent ? `Lapses in ${s.currencyDays - s.daysSinceLast} days · go log a jump.` : 'Log a jump to reset currency.'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>By jump type</Text>
        <View style={styles.card}>
          {s.typeBreakdown.map(({ type, count, pct }, i) => (
            <View key={type} style={[styles.typeRow, i < s.typeBreakdown.length - 1 && styles.typeRowBorder]}>
              <View style={styles.rowBetween}>
                <Text style={styles.typeName}>{type}</Text>
                <Text style={styles.typeCount}>{count} <Text style={styles.typePct}>· {pct}%</Text></Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function makeStoryCardStyles(c: ColorSet) {
  return StyleSheet.create({
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginRight: spacing[3], minWidth: 130 },
  value: { fontFamily: 'JetBrainsMono-Medium', fontSize: 20, color: c.fg, marginTop: spacing[1] },
  });
}

function makeHeroBannerStyles(c: ColorSet) {
  return StyleSheet.create({
  hero: { height: 200, backgroundColor: c.surface2, justifyContent: 'flex-end', overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(10,18,32,0.5)' },
  topRow: { position: 'absolute', top: 44, left: spacing[5] },
  yearLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg2, letterSpacing: 0.8 },
  bottom: { position: 'absolute', bottom: spacing[4], left: spacing[5], right: spacing[5] },
  bigNum: { fontFamily: 'JetBrainsMono-Medium', fontSize: 44, color: c.fg, letterSpacing: -1, lineHeight: 44 },
  bigSub: { fontFamily: 'InterTight-Regular', fontSize: 14, color: c.fg2, marginTop: 4 },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StatsScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [layout, setLayout] = useState<StatsLayout>('Cards');
  const [jumps, setJumps] = useState<JumpFull[]>([]);
  const [currencyMonths, setCurrencyMonths] = useState(1);

  const fetchAll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }

    const [{ data: userData }, { data: jumpData }] = await Promise.all([
      supabase.from('users').select('display_layout_stats_overview, currency_alert_months').eq('id', user.id).single(),
      supabase.from('jumps').select('*, dropzones(name, region, latitude, longitude)').eq('user_id', user.id).is('deleted_at', null).order('date', { ascending: false }),
    ]);

    if (userData?.display_layout_stats_overview) setLayout(userData.display_layout_stats_overview as StatsLayout);
    if (userData?.currency_alert_months != null) setCurrencyMonths(userData.currency_alert_months);
    setJumps((jumpData ?? []) as JumpFull[]);
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { fetchAll(); }, []));

  const stats: StatsBag = useMemo(() => {
    const totalJumps = jumps.length;
    const totalFFSecs = jumps.reduce((s, j) => s + (j.freefall_seconds ?? 0), 0);
    const totalCanopySecs = jumps.reduce((s, j) => s + (j.canopy_seconds ?? 0), 0);
    const avgFFSecs = totalJumps ? Math.round(totalFFSecs / totalJumps) : 0;
    const daysSinceLast = daysSinceLastJump(jumps);

    const now = new Date();
    const monthlyCounts = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return jumps.filter(j => j.date.startsWith(key)).length;
    });

    const typeMap = new Map<string, number>();
    jumps.forEach(j => { if (j.jump_type) typeMap.set(j.jump_type, (typeMap.get(j.jump_type) ?? 0) + 1); });
    const typeBreakdown = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / Math.max(totalJumps, 1)) * 100) }));

    const weeklyCounts = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(now.getTime() - (7 - i) * 7 * 86400000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
      const v = jumps.filter(j => { const d = new Date(j.date); return d >= weekStart && d < weekEnd; }).length;
      return { label: i === 7 ? 'NOW' : `-${7 - i}W`, v, highlight: i === 7 };
    });

    const dzMap = new Map<string, number>();
    jumps.forEach(j => { if (j.dropzones?.name) dzMap.set(j.dropzones.name, (dzMap.get(j.dropzones.name) ?? 0) + 1); });
    const topDZ = dzMap.size ? Array.from(dzMap.entries()).sort((a, b) => b[1] - a[1])[0][0] : '';

    const thisYearStr = String(now.getFullYear());
    const thisYear = jumps.filter(j => j.date.startsWith(thisYearStr)).length;

    return { totalJumps, totalFFSecs, totalCanopySecs, avgFFSecs, daysSinceLast, currencyDays: currencyMonths * 30, monthlySparkline: monthlyCounts, typeBreakdown, weeklyCounts, topDZ, thisYear };
  }, [jumps, currencyMonths]);

  if (loading) {
    return <View style={[styles.screen, styles.center]}><ActivityIndicator color={colors.sky} /></View>;
  }

  const refreshCtrl = (
    <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={colors.sky} />
  );

  return (
    <SafeAreaView style={styles.screen}>
      {layout === 'Cards'   && <StatsA s={stats} />}
      {layout === 'Cockpit' && <StatsB s={stats} />}
      {layout === 'Story'   && <StatsC s={stats} />}
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: spacing[5], paddingBottom: spacing[12] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: spacing[5], paddingBottom: spacing[4] },
  screenTitle: { fontFamily: 'InterTight-Bold', fontSize: 28, color: c.fg, letterSpacing: -0.5 },
  screenSub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.8, color: c.fg3, marginTop: 3 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[3] },
  heroCard: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.lg, padding: spacing[5], marginBottom: spacing[3], alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row2: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[0] },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3 },
  labelSm: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.fg3, marginTop: 3 },
  heroNum: { fontFamily: 'JetBrainsMono-Medium', fontSize: 48, color: c.fg, lineHeight: 52, marginTop: spacing[1] },
  monoMd: { fontFamily: 'JetBrainsMono-Medium', fontSize: 22, color: c.fg, marginTop: spacing[1] },
  heroGaugeLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.sky, letterSpacing: 1.5 },
  heroGaugeNum: { fontFamily: 'JetBrainsMono-Medium', fontSize: 72, color: c.fg, lineHeight: 80, marginTop: spacing[1] },
  heroGaugeSub: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.fg3, letterSpacing: 0.8, marginTop: spacing[2] },
  telLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.fg3, letterSpacing: 1 },
  telValue: { fontFamily: 'JetBrainsMono-Medium', fontSize: 24, color: c.fg, marginTop: spacing[1] },
  telUnit: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.fg3 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[2] },
  trendText: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.ok },
  divider: { height: 1, backgroundColor: c.border, marginVertical: spacing[3] },
  badge: { paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radii.sm },
  badgeOk: { backgroundColor: c.okBg },
  badgeDanger: { backgroundColor: 'rgba(255,107,107,0.12)' },
  badgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.5 },
  sectionTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: c.fg3, letterSpacing: 0.3, marginBottom: spacing[2], marginTop: spacing[1] },
  typeRow: { paddingVertical: spacing[3] },
  typeRowBorder: { borderBottomWidth: 1, borderBottomColor: c.border },
  typeName: { fontFamily: 'InterTight-Regular', fontSize: 13, color: c.fg2 },
  typeCount: { fontFamily: 'JetBrainsMono-Regular', fontSize: 13, color: c.fg },
  typePct: { color: c.fg3 },
  fg: { color: c.fg },
  });
}
