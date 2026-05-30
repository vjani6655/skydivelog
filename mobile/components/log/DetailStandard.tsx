/**
 * 09A · Standard layout
 * Telemetry grid → field list → notes → signed-by
 */
import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { spacing, radii, shadows } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import typography from '@/constants/typography';
import { Badge, Field, Tag } from '@/components/ui';
import type { JumpDetailProps } from '@/app/(tabs)/log/[id]';
import type { JumpEditChange } from '@/lib/types';
import { usePrefs, altNumStr, fmtDetailDate } from '@/lib/prefsContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(s: number | null): string {
  if (s == null) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ─── Telemetry cell ───────────────────────────────────────────────────────────

function TelCell({
  label, value, unit,
}: { label: string; value: string; unit?: string }) {
  const colors = useColors();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[typography.overline, { color: colors.fg3 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 }}>
        <Text style={[typography.numLg, { color: colors.fg }]}>{value}</Text>
        {unit && (
          <Text style={[typography.sm, { color: colors.fg3, marginBottom: 4 }]}>{unit}</Text>
        )}
      </View>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DetailStandard({ jump, signatures, tags, edits }: JumpDetailProps) {
  const { prefs } = usePrefs();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const signed     = signatures.length > 0;
  const sig        = signatures[0];
  const dzName     = jump.dropzones
    ? [jump.dropzones.name, jump.dropzones.region].filter(Boolean).join(', ')
    : '—';
  const aircraft   = [jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(' · ') || '—';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Badge row */}
      <View style={styles.badgeRow}>
        {jump.jump_type && (
          <Badge kind="sky">{jump.jump_type.toUpperCase()}</Badge>
        )}
        {signed ? (
          <Badge kind="ok" icon="check">SIGNED</Badge>
        ) : jump.is_draft ? (
          <Badge kind="warn">DRAFT</Badge>
        ) : (
          <Badge kind="danger">UNSIGNED</Badge>
        )}
        {sig?.outcome === 'pass' && (
          <Badge kind="ok" icon="check">PASS</Badge>
        )}
        {sig?.outcome === 'repeat' && (
          <Badge kind="warn">REPEAT</Badge>
        )}
      </View>

      {/* Telemetry card */}
      <View style={styles.telCard}>
        <View style={styles.telRow}>
          <TelCell label="EXIT ALT"  value={altNumStr(jump.exit_altitude_ft, prefs.altUnit)}  unit={prefs.altUnit} />
          <View style={styles.telDividerV} />
          <TelCell label="FREEFALL"  value={fmtTime(jump.freefall_seconds)} />
        </View>
        <View style={styles.telDividerH} />
        <View style={styles.telRow}>
          <TelCell label="CANOPY"    value={fmtTime(jump.canopy_seconds)} />
          <View style={styles.telDividerV} />
          <TelCell label="PULL ALT"  value={altNumStr(jump.pull_altitude_ft, prefs.altUnit)}  unit={prefs.altUnit} />
        </View>
      </View>

      {/* Field list */}
      <View style={styles.fields}>
        <Field label="DATE"      value={fmtDetailDate(jump.date, prefs.dateFormat)} />
        <Field label="DROPZONE"  value={dzName} />
        <Field label="AIRCRAFT"  value={aircraft} />
        {(jump as any).canopy_type ? (
          <Field label="CANOPY TYPE" value={(jump as any).canopy_type} />
        ) : null}
        {jump.jumper_type && (
          <Field label="JUMPER TYPE" value={jump.jumper_type.charAt(0).toUpperCase() + jump.jumper_type.slice(1)} />
        )}
        {jump.jump_stage && (
          <Field label="JUMP STAGE" value={jump.jump_stage} />
        )}
        {jump.landing_accuracy_value && (
          <Field
            label="LANDING ACCURACY"
            value={`${jump.landing_accuracy_value}${jump.landing_accuracy_unit ? ' ' + jump.landing_accuracy_unit : ''}`}
          />
        )}
        {(jump as any).people_on_jump != null && (
          <Field label="PEOPLE ON JUMP" value={String((jump as any).people_on_jump)} />
        )}
        {tags.length > 0 && (
          <Field
            label="TAGS"
            value={
              <View style={styles.tagRow}>
                {tags.map(t => (
                  <Tag key={t.id} color={t.color} size="sm">{t.name}</Tag>
                ))}
              </View>
            }
          />
        )}
      </View>

      {/* Description of jump */}
      {jump.notes ? (
        <View style={styles.notesCard}>
          <Text style={[typography.overline, styles.sectionLabel]}>JUMP DESCRIPTION</Text>
          <Text style={[typography.body, { color: colors.fg2, lineHeight: 22 }]}>
            {jump.notes}
          </Text>
        </View>
      ) : null}

      {/* Signed by */}
      {sig ? (
        <View style={styles.signedCard}>
          <View style={styles.signedHeader}>
            <Text style={[typography.overline, styles.sectionLabel]}>SIGNED BY</Text>
            {sig.outcome === 'pass' && (
              <Badge kind="ok" icon="check">PASS</Badge>
            )}
            {sig.outcome === 'repeat' && (
              <Badge kind="warn">REPEAT</Badge>
            )}
          </View>
          <View style={styles.signedRow}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.base, { color: colors.fg, fontWeight: '600' }]}>
                {sig.signer_name}
              </Text>
              <Text style={[typography.sm, { color: colors.fg3, marginTop: 2 }]}>
                {sig.signer_licence_number}
                {sig.signer_licence_rating ? ` · ${sig.signer_licence_rating}` : ''}
              </Text>
            </View>
          </View>
          {sig.signed_at ? (
            <Text style={[typography.caption, { color: colors.fg3, marginTop: 4 }]}>
              Signed {fmtDetailDate(sig.signed_at, prefs.dateFormat)}
            </Text>
          ) : null}
          {sig.signature_data ? (
            <View style={styles.sigCanvas}>
              <Svg viewBox="0 0 320 200" width="100%" height={100} preserveAspectRatio="xMidYMid meet">
                <Path
                  d={sig.signature_data}
                  stroke={colors.sky}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          ) : null}
          {sig.notes ? (
            <Text style={[typography.sm, { color: colors.fg2, marginTop: 8 }]}>{sig.notes}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Edit history */}
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

      {/* Created / modified timestamps */}
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
  scroll:   { flex: 1 },
  content:  { padding: spacing[4] },

  // Badges
  badgeRow: { flexDirection: 'row', gap: spacing[1.5], marginBottom: spacing[3] },

  // Telemetry card
  telCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing[2],
    overflow: 'hidden',
    ...shadows.card,
  },
  telRow:      { flexDirection: 'row' },
  telCell:     { flex: 1, padding: spacing[4] },
  telValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing[1], marginTop: spacing[1] },
  telUnit:     { color: colors.fg3, marginBottom: spacing[1] },
  telDividerH: { height: 1,  backgroundColor: colors.border },
  telDividerV: { width: 1,   backgroundColor: colors.border },

  // Fields
  fields:       { marginBottom: spacing[2] },

  // Tags inside Field
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5], marginTop: spacing[1] },

  // Notes
  notesCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing[4],
    marginBottom: spacing[2],
    ...shadows.card,
  },
  sectionLabel: { color: colors.fg3, marginBottom: spacing[2] },

  // Signed by
  signedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing[4],
    marginBottom: spacing[2],
    ...shadows.card,
  },
  signedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[2] },
  signedRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] },
  sigCanvas: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing[2], paddingTop: spacing[2] },
  timestamps: { marginTop: spacing[5], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border, gap: spacing[1] },
  tsText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.fg3 },
  historySection: { marginTop: spacing[5], paddingTop: spacing[4], borderTopWidth: 1, borderTopColor: colors.border },
  historySectionLabel: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[2.5] },
  historyCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.base, padding: spacing[3], marginBottom: spacing[2] },
  historyDate: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.6, color: colors.sky, marginBottom: spacing[2] },
  historyRow: { marginBottom: spacing[1.5] },
  historyField: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.8, color: colors.fg3, marginBottom: 2 },
  historyValues: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  historyFrom: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg2, textDecorationLine: 'line-through' },
  historyArrow: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg3 },
  historyTo: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: colors.fg },
});
}
