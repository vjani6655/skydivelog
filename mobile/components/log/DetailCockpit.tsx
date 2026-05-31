/**
 * 09B · Cockpit / Instrument panel layout
 * Dense mono telemetry grid, DZ card, notes, signed row.
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { spacing, radii, shadows } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import typography from '@/constants/typography';
import { Badge, Tag } from '@/components/ui';
import type { JumpDetailProps } from '@/app/(tabs)/log/[id]';
import type { JumpEditChange } from '@/lib/types';
import { usePrefs, altNumStr, fmtDetailDate, fmtJumpDateTime } from '@/lib/prefsContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(s: number | null): string {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function fmtCoords(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null) return '';
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr} ${lngStr}`;
}

function fmtSignerShort(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length < 2) return name.toUpperCase();
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`.toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TelCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, padding: spacing[3.5] }}>
      <Text style={[typography.overline, { color: colors.fg3 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing[0.5], marginTop: spacing[0.5] }}>
        <Text style={[typography.num, { color: colors.fg }]}>{value}</Text>
        {unit && (
          <Text style={[typography.caption, { color: colors.fg3, marginBottom: 3 }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DetailCockpit({ jump, signatures, tags, edits }: JumpDetailProps) {
  const { prefs } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const signed   = signatures.length > 0;
  const sig      = signatures[0];
  const coords   = fmtCoords(
    jump.dropzones?.latitude  ?? null,
    jump.dropzones?.longitude ?? null,
  );

  // DEPLOY = freefall altitude delta (exit – pull)
  const deployAlt =
    jump.exit_altitude_ft != null && jump.pull_altitude_ft != null
      ? jump.exit_altitude_ft - jump.pull_altitude_ft
      : jump.deploy_altitude_ft;

  const telemetry: Array<{ label: string; value: string; unit?: string }> = [
    { label: 'JUMP #',   value: String(jump.jump_number)                                                   },
    { label: 'EXIT',     value: altNumStr(jump.exit_altitude_ft, prefs.altUnit), unit: prefs.altUnit       },
    { label: 'PULL',     value: altNumStr(jump.pull_altitude_ft, prefs.altUnit), unit: prefs.altUnit       },
    { label: 'FREEFALL', value: fmtTime(jump.freefall_seconds),                  unit: 's'                 },
    { label: 'CANOPY',   value: fmtTime(jump.canopy_seconds),                    unit: 's'                 },
    { label: 'DEPLOY',   value: altNumStr(deployAlt, prefs.altUnit),             unit: `${prefs.altUnit}-Δ` },
  ];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Badge row ─────────────────────────────────────────── */}
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
        {jump.jumper_type && (
          <Badge kind={jump.jumper_type === 'student' ? 'warn' : 'muted'}>
            {jump.jumper_type.toUpperCase()}
          </Badge>
        )}
      </View>

      {/* ── Jump telemetry card ───────────────────────────────── */}
      <View style={styles.telCard}>
        {/* Header row */}
        <View style={styles.telHeader}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>
            JUMP TELEMETRY
          </Text>
          <View style={styles.telHeaderRight}>
            {signed && (
              <>
                <View style={styles.verifiedDot} />
                <Text style={[typography.overline, { color: colors.ok }]}>
                  LOG VERIFIED
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.telDividerH} />

        {/* 2-column grid of 6 cells */}
        {[0, 2, 4].map((i) => (
          <React.Fragment key={i}>
            <View style={styles.telRow}>
              <TelCell {...telemetry[i]}   />
              <View style={styles.telDividerV} />
              <TelCell {...telemetry[i + 1]} />
            </View>
            {i < 4 && <View style={styles.telDividerH} />}
          </React.Fragment>
        ))}
        {/* Landing accuracy */}
        {jump.landing_accuracy_value ? (
          <>
            <View style={styles.telDividerH} />
            <View style={styles.landingRow}>
              <Text style={[typography.overline, { color: colors.fg3 }]}>LANDING ACCURACY</Text>
              <Text style={[typography.num, { color: colors.fg }]}>
                {`${jump.landing_accuracy_value}${jump.landing_accuracy_unit ? ' ' + jump.landing_accuracy_unit : ''}`}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* ── Flight details card ──────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={[typography.overline, { color: colors.fg3, width: 110 }]}>DATE</Text>
          <Text style={[typography.sm, { color: colors.fg, flex: 1 }]}>{fmtJumpDateTime(jump.date, prefs.dateFormat)}</Text>
        </View>
        {jump.jumper_type ? (
          <View style={[styles.detailRow, { marginTop: 8 }]}>
            <Text style={[typography.overline, { color: colors.fg3, width: 110 }]}>JUMPER TYPE</Text>
            <Text style={[typography.sm, { color: colors.fg, flex: 1 }]}>
              {jump.jumper_type.charAt(0).toUpperCase() + jump.jumper_type.slice(1)}
            </Text>
          </View>
        ) : null}
        {jump.jump_stage ? (
          <View style={[styles.detailRow, { marginTop: 8 }]}>
            <Text style={[typography.overline, { color: colors.fg3, width: 110 }]}>JUMP STAGE</Text>
            <Text style={[typography.sm, { color: colors.fg, flex: 1 }]}>{jump.jump_stage}</Text>
          </View>
        ) : null}
        {(jump as any).canopy_type ? (
          <View style={[styles.detailRow, { marginTop: 8 }]}>
            <Text style={[typography.overline, { color: colors.fg3, width: 110 }]}>CANOPY TYPE</Text>
            <Text style={[typography.sm, { color: colors.fg, flex: 1 }]}>{(jump as any).canopy_type}</Text>
          </View>
        ) : null}
        {(jump.coordinates_lat != null && jump.coordinates_lng != null) ? (
          <View style={[styles.detailRow, { marginTop: 8 }]}>
            <Text style={[typography.overline, { color: colors.fg3, width: 110 }]}>COORDINATES</Text>
            <Text style={[typography.sm, { color: colors.fg, flex: 1 }]}>
              {fmtCoords(jump.coordinates_lat, jump.coordinates_lng)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── DZ + Aircraft card ─────────────────────────────────────────────── */}
      <View style={[styles.card, styles.dzCard]}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>DZ</Text>
          <Text style={[typography.base, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
            {jump.dropzones?.name ?? '—'}
          </Text>
          {jump.dropzones?.region ? (
            <Text style={[typography.caption, { color: colors.fg3, marginTop: 1 }]}>
              {jump.dropzones.region}
            </Text>
          ) : null}
          {coords ? (
            <Text style={[typography.caption, { color: colors.fg3, marginTop: 2 }]}>
              {coords}
            </Text>
          ) : null}
        </View>

        <View style={styles.dzDivider} />

        <View style={{ flex: 1, paddingLeft: 16 }}>
          <Text style={[typography.overline, { color: colors.fg3 }]}>AIRCRAFT</Text>
          <Text style={[typography.base, { color: colors.fg, marginTop: 4, fontWeight: '600' }]}>
            {jump.aircraft_type ?? '—'}
          </Text>
          {jump.aircraft_rego ? (
            <Text style={[typography.caption, { color: colors.fg3, marginTop: 2 }]}>
              {jump.aircraft_rego}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── Description / Notes card ────────────────────────── */}
      {(jump.notes || (jump as any).people_on_jump != null || tags.length > 0) && (
        <View style={styles.card}>
          {(jump as any).people_on_jump != null ? (
            <Text style={[typography.overline, { color: colors.fg3, marginBottom: 4 }]}>
              {`PEOPLE ON JUMP: ${(jump as any).people_on_jump}`}
            </Text>
          ) : null}
          {jump.notes ? (
            <>
              <Text style={[typography.overline, { color: colors.fg3, marginBottom: 6 }]}>JUMP DESCRIPTION</Text>
              <Text style={[typography.body, { color: colors.fg2, lineHeight: 22 }]}>
                {jump.notes}
              </Text>
            </>
          ) : null}
          {tags.length > 0 && (
            <View style={[styles.tagRow, jump.notes ? { marginTop: 10 } : {}]}>
              {tags.map(t => (
                <Tag key={t.id} color={t.color} size="sm">{t.name}</Tag>
              ))}
            </View>
          )}
        </View>
      )}

      {/* ── Signature card ────────────────────────────────────── */}
      {sig ? (
        <View style={styles.card}>
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

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(colors: ColorSet) {
  return StyleSheet.create({
  scroll:  { flex: 1 },
  content: { padding: spacing[4], gap: spacing[2] },

  // Badge row
  badgeRow: { flexDirection: 'row', gap: spacing[1.5], marginBottom: spacing[1.5] },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing[4],
    ...shadows.card,
  },

  // Telemetry
  telCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  telHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    paddingHorizontal: spacing[4],
  },
  telHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  verifiedDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ok,
  },
  telRow:      { flexDirection: 'row' },
  telCell:     { flex: 1, padding: 14 },
  telValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 3 },
  telDividerH: { height: 1, backgroundColor: colors.border },
  telDividerV: { width: 1,  backgroundColor: colors.border },

  // DZ card
  dzCard:    { flexDirection: 'row', alignItems: 'flex-start' },
  dzDivider: { width: 1, backgroundColor: colors.border, alignSelf: 'stretch' },

  // Tags
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5] },

  // Landing accuracy full-width row
  landingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },

  // Signed
  signedRow: { flexDirection: 'row', alignItems: 'center' },
  signedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sigCanvas: {
    marginTop: spacing[2.5],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.base,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    height: 90,
    justifyContent: 'center' as const,
  },

  // Flight details
  detailRow: { flexDirection: 'row', alignItems: 'flex-start' },

  // Edit history
  historySection: { marginTop: spacing[2], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border },
  historySectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[2.5] },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.base, padding: spacing[3], marginBottom: spacing[2] },
  historyDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.sky, marginBottom: spacing[2] },
  historyRow: { marginBottom: spacing[1.5] },
  historyField: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: 2 },
  historyValues: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  historyFrom: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg2, textDecorationLine: 'line-through' },
  historyArrow: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg3 },
  historyTo: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: colors.fg },

  // Timestamps
  timestamps: { marginTop: spacing[2], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[1] },
  tsText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.fg3 },
});
}
