/**
 * 09C · Photo-led layout
 * Full-bleed photo hero → 3 telemetry pills → info card (DZ/Aircraft/Tags) → detail card → notes → signature.
 */
import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ImageBackground, Dimensions,
} from 'react-native';
import { spacing, radii, shadows } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import typography from '@/constants/typography';
import { Tag, Badge } from '@/components/ui';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect, Path } from 'react-native-svg';
import type { JumpDetailProps } from '@/app/(tabs)/log/[id]';
import type { JumpEditChange } from '@/lib/types';
import { usePrefs, fmtAltMini, altNumStr, fmtDetailDate, fmtDate } from '@/lib/prefsContext';
import { useAppMedia } from '@/lib/useAppMedia';

const { height: SCREEN_H } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(SCREEN_H * 0.48);
const STRIPES = Array.from({ length: 20 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(s: number | null): string {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Telemetry pill ───────────────────────────────────────────────────────────

function TelPill({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3],
      ...shadows.card,
    }}>
      <Text style={[typography.overline, { color: colors.fg3 }]}>{label}</Text>
      <Text style={[typography.numSm, { color: colors.fg, marginTop: spacing[1] }]}>{value}</Text>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DetailPhotoLed({ jump, signatures, tags, edits }: JumpDetailProps) {
  const { prefs } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const signed = signatures.length > 0;
  const sig    = signatures[0];
  const dzName = jump.dropzones?.name ?? null;
  const aircraft = [jump.aircraft_rego, jump.aircraft_type].filter(Boolean).join(' · ') || null;
  const appHeroUrl = useAppMedia('detail_photo_hero');
  const heroPhotoUrl = jump.photo_url ?? appHeroUrl;

  const hasExtraDetails = !!(
    (jump as any).canopy_type ||
    jump.jumper_type ||
    jump.jump_stage ||
    jump.deploy_altitude_ft != null ||
    jump.landing_accuracy_value ||
    (jump as any).people_on_jump != null
  );

  const heroTitle = [
    jump.jump_type ?? null,
    dzName,
  ].filter(Boolean).join(' · ') || `Jump #${jump.jump_number}`;

  const dateLabel = `JUMP #${jump.jump_number} · ${fmtDate(jump.date, prefs.dateFormat).toUpperCase()}`;

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

      {/* ── Photo / striped hero ─────────────────────────────── */}
      {heroPhotoUrl ? (
        <ImageBackground
          source={{ uri: heroPhotoUrl }}
          style={[styles.hero, { height: PHOTO_HEIGHT }]}
          resizeMode="cover"
        >
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox="0 0 1 1"
            preserveAspectRatio="none"
            pointerEvents="none"
          >
            <Defs>
              <SvgLinearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0.25" stopColor="rgb(10,18,32)" stopOpacity="0" />
                <Stop offset="0.65" stopColor="rgb(10,18,32)" stopOpacity="0.55" />
                <Stop offset="1"    stopColor="rgb(10,18,32)" stopOpacity="0.88" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#heroGrad)" />
          </Svg>
          <View style={styles.heroOverlay}>
            <Text style={[typography.overline, { color: 'rgba(255,255,255,0.55)', letterSpacing: 0.6 }]}>{dateLabel}</Text>
            <Text style={[typography.h2, { color: '#fff', marginTop: spacing[1] }]}>{heroTitle}</Text>
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.stripesHero, { height: PHOTO_HEIGHT }]}>
          {STRIPES.map((_, i) => (
            <View
              key={i}
              style={{ flex: 1, backgroundColor: i % 2 === 0 ? colors.surface : colors.surface3 }}
            />
          ))}
          <Text style={[typography.overline, styles.photoLabel]}>CANOPY PHOTO · 1024×768</Text>
          <View style={styles.heroOverlay}>
            <Text style={[typography.overline, { color: colors.fg3, letterSpacing: 0.6 }]}>{dateLabel}</Text>
            <Text style={[typography.h2, { color: colors.fg, marginTop: spacing[1] }]}>{heroTitle}</Text>
          </View>
        </View>
      )}

      {/* ── Badges ────────────────────────────────────────────── */}
      <View style={styles.badgeRow}>
        {jump.jump_type && <Badge kind="sky">{jump.jump_type.toUpperCase()}</Badge>}
        {signed ? (
          <Badge kind="ok" icon="check">SIGNED</Badge>
        ) : jump.is_draft ? (
          <Badge kind="warn">DRAFT</Badge>
        ) : (
          <Badge kind="danger">UNSIGNED</Badge>
        )}
        {sig?.outcome === 'pass'   && <Badge kind="ok" icon="check">PASS</Badge>}
        {sig?.outcome === 'repeat' && <Badge kind="warn">REPEAT</Badge>}
      </View>

      {/* ── 2×2 telemetry pills ──────────────────────────────── */}
      <View style={styles.pillRow}>
        <TelPill label="EXIT"   value={fmtAltMini(jump.exit_altitude_ft, prefs.altUnit)} />
        <TelPill label="FF"     value={fmtTime(jump.freefall_seconds)} />
      </View>
      <View style={styles.pillRow}>
        <TelPill label="CANOPY" value={fmtTime(jump.canopy_seconds)} />
        <TelPill label="PULL"   value={fmtAltMini(jump.pull_altitude_ft, prefs.altUnit)} />
      </View>

      {/* ── Info card: DZ + Aircraft + Date + Tags ─────────────── */}
      <View style={styles.card}>
        {/* DZ / Aircraft row */}
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.overline, { color: colors.fg3 }]}>DROPZONE</Text>
            <Text style={[typography.base, { color: colors.fg, fontWeight: '600', marginTop: spacing[1] }]}>
              {dzName ?? '—'}
            </Text>
            {jump.dropzones?.region ? (
              <Text style={[typography.caption, { color: colors.fg3, marginTop: 2 }]}>
                {jump.dropzones.region}
              </Text>
            ) : null}
          </View>
          {aircraft ? (
            <View style={{ flex: 1, paddingLeft: spacing[4] }}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>AIRCRAFT</Text>
              <Text style={[typography.sm, { color: colors.fg2, marginTop: spacing[1] }]}>
                {aircraft}
              </Text>
            </View>
          ) : null}
        </View>
        {/* Date row */}
        <View style={{ marginTop: spacing[3] }}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>DATE</Text>
          <Text style={[typography.sm, { color: colors.fg2, marginTop: spacing[1] }]}>
            {fmtDetailDate(jump.created_at, prefs.dateFormat)}
          </Text>
        </View>
        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.map(t => (
              <Tag key={t.id} color={t.color} size="sm">{t.name}</Tag>
            ))}
          </View>
        )}
      </View>

      {/* ── Extra details card ────────────────────────────────── */}
      {hasExtraDetails && (
        <View style={styles.card}>
          {(jump as any).canopy_type ? (
            <View style={styles.detailItem}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>CANOPY TYPE</Text>
              <Text style={[typography.base, { color: colors.fg, fontWeight: '600', marginTop: spacing[1] }]}>
                {(jump as any).canopy_type}
              </Text>
            </View>
          ) : null}
          {jump.jumper_type ? (
            <View style={styles.detailItem}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>JUMPER TYPE</Text>
              <Text style={[typography.sm, { color: colors.fg, fontWeight: '600', marginTop: spacing[1] }]}>
                {jump.jumper_type.charAt(0).toUpperCase() + jump.jumper_type.slice(1)}
                {jump.jump_stage ? ` · ${jump.jump_stage}` : ''}
              </Text>
            </View>
          ) : null}
          {jump.deploy_altitude_ft != null ? (
            <View style={styles.detailItem}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>DEPLOY ALT</Text>
              <Text style={[typography.sm, { color: colors.fg, fontWeight: '600', marginTop: spacing[1] }]}>
                {prefs.altUnit === 'm'
                  ? `${Math.round(jump.deploy_altitude_ft * 0.3048).toLocaleString()} m-Δ`
                  : `${jump.deploy_altitude_ft.toLocaleString()} ft-Δ`}
              </Text>
            </View>
          ) : null}
          {jump.landing_accuracy_value ? (
            <View style={styles.detailItem}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>LANDING ACCURACY</Text>
              <Text style={[typography.base, { color: colors.fg, fontWeight: '600', marginTop: spacing[1] }]}>
                {`${jump.landing_accuracy_value}${jump.landing_accuracy_unit ? ' ' + jump.landing_accuracy_unit : ''}`}
              </Text>
            </View>
          ) : null}
          {(jump as any).people_on_jump != null ? (
            <View style={styles.detailItem}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>PEOPLE ON JUMP</Text>
              <Text style={[typography.base, { color: colors.fg, fontWeight: '600', marginTop: spacing[1] }]}>
                {String((jump as any).people_on_jump)}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── Notes card ────────────────────────────────────────── */}
      {jump.notes ? (
        <View style={styles.card}>
          <Text style={[typography.overline, { color: colors.fg3, marginBottom: spacing[2] }]}>JUMP DESCRIPTION</Text>
          <Text style={[typography.body, { color: colors.fg2, lineHeight: 22 }]}>
            {jump.notes}
          </Text>
        </View>
      ) : null}

      {/* ── Signature card ────────────────────────────────────── */}
      {sig ? (
        <View style={styles.card}>
          <View style={styles.signedHeader}>
            <Text style={[typography.overline, { color: colors.fg3 }]}>SIGNED BY</Text>
            {sig.outcome === 'pass'   && <Badge kind="ok" icon="check">PASS</Badge>}
            {sig.outcome === 'repeat' && <Badge kind="warn">REPEAT</Badge>}
          </View>
          <Text style={[typography.base, { color: colors.fg, fontWeight: '600', marginTop: spacing[1.5] }]}>
            {sig.signer_name}
          </Text>
          <Text style={[typography.sm, { color: colors.fg3, marginTop: 2 }]}>
            {sig.signer_licence_number}
            {sig.signer_licence_rating ? ` · ${sig.signer_licence_rating}` : ''}
          </Text>
          {sig.signed_at ? (
            <Text style={[typography.caption, { color: colors.fg3, marginTop: spacing[1] }]}>
              Signed {fmtDetailDate(sig.signed_at, prefs.dateFormat)}
            </Text>
          ) : null}
          {sig.signature_data ? (
            <View style={styles.sigCanvas}>
              <Svg viewBox="0 0 320 200" width="100%" height={100} preserveAspectRatio="xMidYMid meet">
                <Path d={sig.signature_data} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          ) : null}
          {sig.notes ? (
            <Text style={[typography.sm, { color: colors.fg2, marginTop: spacing[2] }]}>{sig.notes}</Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Edit history ─────────────────────────────────────── */}
      {edits.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historySectionLabel}>EDIT HISTORY</Text>
          {edits.map(edit => (
            <View key={edit.id} style={styles.historyCard}>
              <Text style={styles.historyDate}>{fmtDetailDate(edit.edited_at, prefs.dateFormat)}</Text>
              {(edit.changes as JumpEditChange[]).map((c, i) => (
                <View key={i} style={styles.historyRow}>
                  <Text style={styles.historyField}>{c.field.toUpperCase()}</Text>
                  <View style={styles.historyValues}>
                    <Text style={styles.historyFrom}>{c.from}</Text>
                    <Text style={styles.historyArrow}>{' → '}</Text>
                    <Text style={styles.historyTo}>{c.to}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {/* ── Timestamps ───────────────────────────────────────── */}
      <View style={styles.timestamps}>
        <Text style={styles.tsText}>Logged {fmtDetailDate(jump.created_at, prefs.dateFormat)}</Text>
        {jump.updated_at && jump.updated_at !== jump.created_at ? (
          <Text style={styles.tsText}>Last modified {fmtDetailDate(jump.updated_at, prefs.dateFormat)}</Text>
        ) : null}
      </View>

      <View style={{ height: spacing[10] }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
  // Photo hero — ImageBackground IS the container
  hero: {
    width: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  // Stripes hero — flexDirection column with explicit height so flex:1 children work
  stripesHero: {
    width: '100%',
    overflow: 'hidden',
    flexDirection: 'column' as const,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  photoLabel: {
    position: 'absolute',
    color: colors.fg3,
    top: '40%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[5],
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },

  pillRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[1],
  },

  card: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    ...shadows.card,
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    marginTop: spacing[3],
  },

  detailItem: {
    paddingVertical: spacing[1.5],
  },

  signedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sigCanvas: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing[2.5],
    paddingTop: spacing[2],
  },

  historySection: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historySectionLabel: {
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 9,
    letterSpacing: 0.8,
    color: colors.fg3,
    marginBottom: spacing[2.5],
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.base,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  historyDate:   { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.sky, marginBottom: spacing[2] },
  historyRow:    { marginBottom: spacing[1.5] },
  historyField:  { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: 2 },
  historyValues: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  historyFrom:   { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg2, textDecorationLine: 'line-through' },
  historyArrow:  { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg3 },
  historyTo:     { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: colors.fg },

  timestamps: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing[1],
  },
  tsText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.fg3 },
});
}
