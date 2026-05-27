/**
 * 09C · Photo-led layout
 * Full-width photo hero → compact telemetry row → DZ/Aircraft → tags → notes.
 */
import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ImageBackground, Dimensions,
} from 'react-native';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import typography from '@/constants/typography';
import { Tag } from '@/components/ui';
import { Badge } from '@/components/ui';
import Svg, { Path } from 'react-native-svg';
import type { JumpDetailProps } from '@/app/(tabs)/log/[id]';
import type { JumpEditChange } from '@/lib/types';
import { usePrefs, fmtAltMini, fmtDetailDate, fmtDate } from '@/lib/prefsContext';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_HEIGHT = Math.round(SCREEN_W * 0.625); // ~5:8 ratio

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(s: number | null): string {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Compact telemetry cell ───────────────────────────────────────────────────

function MiniTel({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, paddingVertical: 14, paddingHorizontal: 16 }}>
      <Text style={[typography.overline, { color: colors.fg3 }]}>{label}</Text>
      <Text style={[typography.numSm, { color: colors.fg, marginTop: 2 }]}>{value}</Text>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DetailPhotoLed({ jump, signatures, tags, edits }: JumpDetailProps) {
  const { prefs } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const signed   = signatures.length > 0;
  const sig      = signatures[0];
  const dzName   = jump.dropzones?.name ?? null;
  const aircraft = [jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(' · ') || null;

  const heroTitle = [
    jump.jump_type ?? null,
    dzName,
  ].filter(Boolean).join(' · ') || `Jump #${jump.jump_number}`;

  const dateLabel = `JUMP #${jump.jump_number} · ${fmtDate(jump.date, prefs.dateFormat).toUpperCase()}`;

  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* ── Photo hero ────────────────────────────────────────── */}
      <View style={[styles.photo, { height: PHOTO_HEIGHT }]}>
        {jump.photo_url ? (
          <ImageBackground
            source={{ uri: jump.photo_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          /* Striped placeholder */
          <View style={[StyleSheet.absoluteFill, styles.stripes]} />
        )}

        {/* Bottom gradient overlay */}
        <View style={styles.overlayTop}    pointerEvents="none" />
        <View style={styles.overlayBottom} pointerEvents="none" />

        {/* Placeholder label */}
        {!jump.photo_url && (
          <Text style={[typography.overline, styles.photoLabel]}>
            CANOPY PHOTO · 1024×768
          </Text>
        )}

        {/* Jump info overlay — bottom of photo */}
        <View style={styles.heroOverlay}>
          <Text style={[typography.overline, { color: colors.fg3, letterSpacing: 0.5 }]}>
            {dateLabel}
          </Text>
          <Text style={[typography.h2, { color: colors.fg, marginTop: 4 }]}>
            {heroTitle}
          </Text>
        </View>
      </View>

      {/* ── Compact telemetry row ─────────────────────────────── */}
      <View style={styles.miniRow}>
        <MiniTel label="EXIT"   value={fmtAltMini(jump.exit_altitude_ft, prefs.altUnit)} />
        <View style={styles.miniDivider} />        <MiniTel label="PULL"   value={fmtAltMini(jump.pull_altitude_ft, prefs.altUnit)} />
        <View style={styles.miniDivider} />        <MiniTel label="FF"     value={fmtTime(jump.freefall_seconds)} />
        <View style={styles.miniDivider} />
        <MiniTel label="CANOPY" value={fmtTime(jump.canopy_seconds)} />
      </View>
      {/* ── Badge row ──────────────────────────────────────── */}
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
      {/* ── DZ + Aircraft ─────────────────────────────────────── */}
      <View style={styles.dzRow}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>DROPZONE</Text>
          <Text style={[typography.base, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
            {dzName ?? '—'}
          </Text>
          {jump.dropzones?.region ? (
            <Text style={[typography.caption, { color: colors.fg3, marginTop: 1 }]}>
              {jump.dropzones.region}
            </Text>
          ) : null}
        </View>
        <View style={styles.dzDivider} />
        <View style={{ flex: 1, paddingLeft: 16 }}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>AIRCRAFT</Text>
          <Text style={[typography.sm, { color: colors.fg2, marginTop: 4 }]}>
            {aircraft ?? '—'}
          </Text>
        </View>
      </View>

      {/* ── Canopy type ───────────────────────────────────────────── */}
      {(jump as any).canopy_type ? (
        <View style={styles.dzRow}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.overline, { color: colors.fg3 }]}>CANOPY TYPE</Text>
            <Text style={[typography.base, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
              {(jump as any).canopy_type}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Jumper info ───────────────────────────────────────────── */}
      {(jump.jumper_type || jump.jump_stage || jump.deploy_altitude_ft != null) && (
        <View style={styles.dzRow}>
          {jump.jumper_type ? (
            <View style={{ flex: 1 }}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>JUMPER TYPE</Text>
              <Text style={[typography.sm, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
                {jump.jumper_type.charAt(0).toUpperCase() + jump.jumper_type.slice(1)}
              </Text>
              {jump.jump_stage ? (
                <Text style={[typography.caption, { color: colors.fg3, marginTop: 1 }]}>
                  {jump.jump_stage}
                </Text>
              ) : null}
            </View>
          ) : null}
          {jump.jumper_type && jump.deploy_altitude_ft != null && <View style={styles.dzDivider} />}
          {jump.deploy_altitude_ft != null ? (
            <View style={[{ flex: 1 }, jump.jumper_type ? { paddingLeft: 16 } : {}]}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>DEPLOY ALT</Text>
              <Text style={[typography.sm, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
                {prefs.altUnit === 'm'
                  ? `${Math.round(jump.deploy_altitude_ft * 0.3048).toLocaleString()} m-Δ`
                  : `${jump.deploy_altitude_ft.toLocaleString()} ft-Δ`
                }
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── Tags ──────────────────────────────────────────────── */}
      {tags.length > 0 && (
        <View style={styles.section}>
          <View style={styles.tagRow}>
            {tags.map(t => (
              <Tag key={t.id} color={t.color} size="sm">{t.name}</Tag>
            ))}
          </View>
        </View>
      )}

      {/* ── Notes ─────────────────────────────────────────────── */}
      {jump.landing_accuracy_value ? (
        <View style={styles.section}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>LANDING ACCURACY</Text>
          <Text style={[typography.base, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
            {`${jump.landing_accuracy_value}${jump.landing_accuracy_unit ? ' ' + jump.landing_accuracy_unit : ''}`}
          </Text>
        </View>
      ) : null}
      {(jump as any).people_on_jump != null ? (
        <View style={styles.section}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>PEOPLE ON JUMP</Text>
          <Text style={[typography.base, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
            {String((jump as any).people_on_jump)}
          </Text>
        </View>
      ) : null}

      {jump.notes ? (
        <View style={styles.section}>
          <Text style={[typography.overline, { color: colors.fg3, marginBottom: 8 }]}>
            JUMP DESCRIPTION
          </Text>
          <Text style={[typography.body, { color: colors.fg2, lineHeight: 22 }]}>
            {jump.notes}
          </Text>
        </View>
      ) : null}

      {/* ── Signature ─────────────────────────────────────────── */}
      {sig ? (
        <View style={styles.section}>
          <View style={styles.signedHeader}>
            <Text style={[typography.overline, { color: colors.fg3 }]}>SIGNED BY</Text>
            {sig.outcome === 'pass'   && <Badge kind="ok" icon="check">PASS</Badge>}
            {sig.outcome === 'repeat' && <Badge kind="warn">REPEAT</Badge>}
          </View>
          <Text style={[typography.base, { color: colors.fg, fontWeight: '600', marginTop: 6 }]}>
            {sig.signer_name}
          </Text>
          <Text style={[typography.sm, { color: colors.fg3, marginTop: 2 }]}>
            {sig.signer_licence_number}
            {sig.signer_licence_rating ? ` · ${sig.signer_licence_rating}` : ''}
          </Text>
          {sig.signature_data ? (
            <View style={styles.sigCanvas}>
              <Svg viewBox="0 0 320 200" width="100%" height={90} preserveAspectRatio="xMidYMid meet">
                <Path d={sig.signature_data} stroke={colors.sky} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
          ) : null}
          {sig.notes ? (
            <Text style={[typography.sm, { color: colors.fg2, marginTop: 8 }]}>{sig.notes}</Text>
          ) : null}
          {sig.signed_at ? (
            <Text style={[typography.caption, { color: colors.fg3, marginTop: 6 }]}>
              Signed {fmtDetailDate(sig.signed_at, prefs.dateFormat)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Edit history ────────────────────────────────────────── */}
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

      {/* ── Timestamps ─────────────────────────────────────────── */}
      <View style={styles.timestamps}>
        <Text style={styles.tsText}>Logged {fmtDetailDate(jump.created_at, prefs.dateFormat)}</Text>
        {jump.updated_at && jump.updated_at !== jump.created_at ? (
          <Text style={styles.tsText}>Last modified {fmtDetailDate(jump.updated_at, prefs.dateFormat)}</Text>
        ) : null}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
  // Photo hero
  photo: {
    width: '100%',
    backgroundColor: colors.surface2,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stripes: {
    backgroundColor: colors.surface,
    opacity: 0.9,
  },
  overlayTop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: Math.round(PHOTO_HEIGHT * 0.4),
    backgroundColor: 'rgba(10,18,32,0.18)',
  },
  overlayBottom: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: Math.round(PHOTO_HEIGHT * 0.55),
    backgroundColor: 'rgba(10,18,32,0.82)',
  },
  photoLabel: {
    position: 'absolute',
    color: colors.fg4,
    top: '38%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 18,
  },

  // Compact telemetry
  miniRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  miniCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  miniDivider: { width: 1, backgroundColor: colors.border },

  // DZ / Aircraft
  dzRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dzDivider: { width: 1, backgroundColor: colors.border, alignSelf: 'stretch' },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  signedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sigCanvas: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    height: 90,
    justifyContent: 'center' as const,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  // Edit history
  historySection: { marginHorizontal: 16, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border },
  historySectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: 10 },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, marginBottom: 8 },
  historyDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.sky, marginBottom: 8 },
  historyRow: { marginBottom: 6 },
  historyField: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: 2 },
  historyValues: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  historyFrom: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg2, textDecorationLine: 'line-through' },
  historyArrow: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg3 },
  historyTo: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: colors.fg },

  // Timestamps
  timestamps: { marginHorizontal: 16, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border, gap: 4 },
  tsText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.fg3 },
});
}
