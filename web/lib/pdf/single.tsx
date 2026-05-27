/**
 * Pdf1A — Classic Formal layout
 * One A4 page per jump. Adapts: Licensed (compact) | Student (instructor-notes block).
 */
import React from 'react'
import {
  Document, Page, View, Text, StyleSheet, Font, Svg, Path,
} from '@react-pdf/renderer'
import path from 'path'
import type { JumperProfile, PdfJump } from './types'
import { fmtJumpDate, fmtAlt, fmtMSS, fmtExportedAt } from './helpers'

// ─── Fonts ───────────────────────────────────────────────────────────────────

const FONTS = path.join(process.cwd(), 'node_modules')

Font.register({
  family: 'InterTight',
  fonts: [
    { src: path.join(FONTS, '@expo-google-fonts/inter-tight/400Regular/InterTight_400Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONTS, '@expo-google-fonts/inter-tight/500Medium/InterTight_500Medium.ttf'),   fontWeight: 500 },
    { src: path.join(FONTS, '@expo-google-fonts/inter-tight/600SemiBold/InterTight_600SemiBold.ttf'), fontWeight: 600 },
    { src: path.join(FONTS, '@expo-google-fonts/inter-tight/700Bold/InterTight_700Bold.ttf'),       fontWeight: 700 },
  ],
})

Font.register({
  family: 'JetBrainsMono',
  fonts: [
    { src: path.join(FONTS, '@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'), fontWeight: 400 },
    { src: path.join(FONTS, '@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf'),   fontWeight: 500 },
  ],
})

Font.registerHyphenationCallback(w => [w])

// ─── Design tokens ───────────────────────────────────────────────────────────

const PAPER        = '#FAFAF7'
const CREAM        = '#F5F3EE'
const INK          = '#0A1220'
const INK_2        = '#3D4E6A'
const INK_3        = '#7F8B9D'
const INK_4        = '#B6BCC6'
const RULE         = '#D8D4C8'
const RULE_HEAVY   = '#1A1A1A'
const HIGHLIGHT_BG = '#FFF4D6'
const HIGHLIGHT_FG = '#7A4C00'
const PASS_BG      = '#E8F5E9'
const PASS_FG      = '#2E7D32'
const REPEAT_BG    = '#FFF3E0'
const REPEAT_FG    = '#E65100'

// ─── Shared styles ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  ui:   { fontFamily: 'InterTight' },
  mono: { fontFamily: 'JetBrainsMono' },
  page: {
    backgroundColor: PAPER,
    color: INK,
    fontFamily: 'InterTight',
    fontSize: 11,
  },
  // Page header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 56,
    paddingTop: 26,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  // Page body
  body: {
    paddingHorizontal: 56,
    paddingTop: 14,
  },
  // Absolute footer
  footer: {
    position: 'absolute',
    left: 56,
    right: 56,
    bottom: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 8,
    color: INK_3,
    letterSpacing: 0.8,
  },
})

// ─── Sub-components ──────────────────────────────────────────────────────────

const LogoMark = () => (
  <Svg width={20} height={20} viewBox="0 0 64 64">
    <Path d="M6 28 C 8 18, 14 14, 22 14 L 42 14 C 50 14, 56 18, 58 28 L 50 26 L 42 28 L 32 26 L 22 28 L 14 26 Z" fill={INK} />
    <Path d="M10 28 L 32 50 L 54 28" stroke={INK} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M28 46 A4 4 0 0 1 36 46 L36 58 A4 4 0 0 1 28 58 Z" fill={INK} />
  </Svg>
)

const PageHeader = ({
  title, sub, pageInfo, jumper,
}: {
  title: string; sub: string; pageInfo: string; jumper: JumperProfile
}) => (
  <View style={s.header}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <LogoMark />
      <View>
        <Text style={[s.ui, { fontSize: 12, fontWeight: 700, letterSpacing: -0.1 }]}>Jump Logs</Text>
        <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 0.8, marginTop: 1 }]}>
          OFFICIAL LOGBOOK EXTRACT · {jumper.licence_number ?? 'UNLICENSED'}
        </Text>
      </View>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[s.ui, { fontSize: 10, fontWeight: 600 }]}>{title}</Text>
      <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 0.7, marginTop: 2 }]}>
        {sub} · PAGE {pageInfo}
      </Text>
    </View>
  </View>
)

const PageFooter = ({ exportedAt }: { exportedAt: string }) => (
  <View style={s.footer}>
    <Text style={s.footerText}>JUMPLOGS.APP · EXPORTED {exportedAt}</Text>
  </View>
)

// Renders the actual SVG paths drawn by the signer on the pad (320×200 canvas)
// Scaled to fit a 220×70 space in the PDF.
const ActualSignature = ({ data }: { data: string }) => (
  <Svg width={220} height={70} viewBox="0 0 320 200">
    <Path
      d={data}
      stroke={INK}
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

// Fallback decorative curve when no real signature data is stored
const SigCurve = () => (
  <Svg width={200} height={36} viewBox="0 0 260 44">
    <Path
      d="M8 28 C 28 14, 50 34, 74 22 S 132 30, 158 18 S 210 8, 252 26"
      stroke={INK}
      strokeWidth={1.4}
      fill="none"
      strokeLinecap="round"
    />
  </Svg>
)

// ─── Per-jump page ────────────────────────────────────────────────────────────

function SinglePage({
  jump, jumper, pageInfo, exportedAt,
}: {
  jump: PdfJump
  jumper: JumperProfile
  pageInfo: string
  exportedAt: string
}) {
  const isStudent = jump.jumper_type === 'student'
  const { day, date } = fmtJumpDate(jump.date)

  // Three-column data row
  const DataRow = ({ cells }: {
    cells: Array<{ label: string; value: string; flex?: number }>
  }) => (
    <View style={{ flexDirection: 'row', gap: 18, marginBottom: 6 }}>
      {cells.map((c, i) => (
        <View
          key={i}
          style={{
            flex: c.flex ?? 1.4,
            paddingBottom: 6,
            borderBottomWidth: 1,
            borderBottomColor: RULE,
          }}
        >
          <Text style={[s.mono, { fontSize: 7.5, color: INK_3, letterSpacing: 0.9, marginBottom: 2 }]}>
            {c.label.toUpperCase()}
          </Text>
          <Text style={[s.ui, { fontSize: 10, color: INK }]}>{c.value || '—'}</Text>
        </View>
      ))}
    </View>
  )

  const dzLabel = [jump.dz_name, jump.dz_region].filter(Boolean).join(', ')
  const acLabel = [jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(' · ')
  const accLabel = jump.landing_accuracy_value
    ? `${jump.landing_accuracy_value} ${jump.landing_accuracy_unit ?? ''}`.trim()
    : '—'

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title={isStudent ? 'Student jump record' : 'Jump record'}
        sub="OFFICIAL ENTRY"
        pageInfo={pageInfo}
        jumper={jumper}
      />

      <View style={s.body}>
        {/* ── Hero row: jump number + jumper  |  date ── */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 8,
        }}>
          <View>
            <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 1 }]}>JUMP №</Text>
            <Text style={[s.mono, { fontSize: 32, fontWeight: 500, lineHeight: 1, marginTop: 3 }]}>
              {jump.jump_number}
            </Text>
            <View style={{ marginTop: 6 }}>
              <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 1.1 }]}>JUMPER</Text>
              <Text style={[s.ui, { fontSize: 13, fontWeight: 600, letterSpacing: -0.2, marginTop: 2 }]}>
                {jumper.full_name}
              </Text>
              <Text style={[s.mono, { fontSize: 9, color: INK_2, marginTop: 2 }]}>
                {jumper.licence_number ?? 'No licence'} · {isStudent ? 'Student' : jumper.licence_rating ? `${jumper.licence_rating} · Licensed` : 'Licensed'}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 1 }]}>DATE</Text>
            <Text style={[s.mono, { fontSize: 13, fontWeight: 500, marginTop: 4 }]}>{day} · {date}</Text>
            {isStudent && (
              <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
                <View style={{ backgroundColor: HIGHLIGHT_BG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 }}>
                  <Text style={[s.mono, { fontSize: 8, letterSpacing: 1, color: HIGHLIGHT_FG }]}>
                    STUDENT · {((jump.jump_stage ?? jump.jump_type) ?? '').toUpperCase()}
                  </Text>
                </View>
                {jump.signer_outcome === 'pass' && (
                  <View style={{ backgroundColor: PASS_BG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 }}>
                    <Text style={[s.mono, { fontSize: 8, letterSpacing: 1, color: PASS_FG }]}>PASS</Text>
                  </View>
                )}
                {jump.signer_outcome === 'repeat' && (
                  <View style={{ backgroundColor: REPEAT_BG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 }}>
                    <Text style={[s.mono, { fontSize: 8, letterSpacing: 1, color: REPEAT_FG }]}>REPEAT</Text>
                  </View>
                )}
                {!jump.signer_name && (
                  <View style={{ backgroundColor: HIGHLIGHT_BG, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 }}>
                    <Text style={[s.mono, { fontSize: 8, letterSpacing: 1, color: HIGHLIGHT_FG }]}>PENDING</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Heavy rule */}
        <View style={{ height: 1, backgroundColor: RULE_HEAVY, marginBottom: 8 }} />

        {/* Data grid — 3×3 */}
        <DataRow cells={[
          { label: 'Dropzone',        value: dzLabel || '—' },
          { label: 'Aircraft',        value: acLabel || '—' },
          { label: 'Jump type',       value: jump.jump_type ?? '—', flex: 1 },
        ]} />
        <DataRow cells={[
          { label: 'Jumper category', value: isStudent ? 'Student' : 'Licensed' },
          { label: 'Exit altitude',   value: jump.exit_altitude_ft ? `${fmtAlt(jump.exit_altitude_ft)} ft` : '—' },
          { label: 'Pull altitude',   value: jump.pull_altitude_ft ? `${fmtAlt(jump.pull_altitude_ft)} ft` : '—', flex: 1 },
        ]} />
        <DataRow cells={[
          { label: 'Freefall time',    value: jump.freefall_seconds ? `${jump.freefall_seconds} s` : '—', flex: 1 },
          { label: 'Canopy time',      value: fmtMSS(jump.canopy_seconds), flex: 1 },
          { label: 'Canopy type',      value: jump.canopy_type ?? '—', flex: 1 },
          { label: 'Landing accuracy', value: accLabel, flex: 1 },
        ]} />
        {jump.people_on_jump != null && (
          <DataRow cells={[
            { label: 'People on jump', value: String(jump.people_on_jump), flex: 1 },
            { label: '', value: '', flex: 3 },
          ]} />
        )}

        {/* Description of jump */}
        {jump.notes ? (
          <View style={{ marginTop: 4, marginBottom: 8 }}>
            <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 1, marginBottom: 4 }]}>
              {isStudent ? 'JUMP DESCRIPTION' : 'JUMP DESCRIPTION'}
            </Text>
            <View style={{
              backgroundColor: CREAM,
              borderWidth: 1,
              borderColor: RULE,
              borderRadius: 4,
              padding: 10,
            }}>
              <Text style={[s.ui, { fontSize: 10, color: INK_2, lineHeight: 1.5 }]}>{jump.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Instructor notes — student only */}
        {isStudent && (
          <View style={{ marginTop: 6, marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 1 }]}>
                INSTRUCTOR NOTES · REQUIRED
              </Text>
              {jump.signer_name ? (
                <Text style={[s.mono, { fontSize: 8, color: HIGHLIGHT_FG, letterSpacing: 1 }]}>
                  {jump.signer_name.toUpperCase()} · {jump.signer_licence_number}
                </Text>
              ) : null}
            </View>
            <View style={{
              backgroundColor: PAPER,
              borderWidth: 1.5,
              borderColor: INK,
              borderRadius: 4,
              padding: 10,
              minHeight: 65,
            }}>
              <Text style={[s.ui, { fontSize: 10, color: INK, lineHeight: 1.5 }]}>
                {jump.signer_notes ?? ''}
              </Text>
            </View>
          </View>
        )}

        {/* Sign-off */}
        {jump.signer_name ? (
          <View style={{ marginTop: 10 }}>
            <Text style={[s.mono, { fontSize: 8, color: INK_3, letterSpacing: 1.2, marginBottom: 8 }]}>SIGNED BY</Text>
            {jump.signer_signature_data
              ? <ActualSignature data={jump.signer_signature_data} />
              : <SigCurve />
            }
            <View style={{
              borderTopWidth: 1,
              borderTopColor: INK,
              paddingTop: 5,
              marginTop: 0,
              width: 200,
            }}>
              <Text style={[s.ui, { fontSize: 11, fontWeight: 600 }]}>{jump.signer_name}</Text>
              <Text style={[s.mono, { fontSize: 8, color: INK_3, marginTop: 2 }]}>
                {[jump.signer_licence_number, jump.signer_licence_rating].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            <Text style={[s.mono, { fontSize: 8, color: INK_4, letterSpacing: 1.2 }]}>UNSIGNED</Text>
          </View>
        )}
      </View>

      <PageFooter exportedAt={exportedAt} />
    </Page>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function SingleDocument({
  jumps,
  jumper,
}: {
  jumps: PdfJump[]
  jumper: JumperProfile
}) {
  const exportedAt = fmtExportedAt()

  return (
    <Document
      title={`Jump Logs — ${jumper.full_name}`}
      author="Jump Logs"
      creator="jumplogs.com"
    >
      {jumps.map((jump, i) => (
        <SinglePage
          key={jump.id}
          jump={jump}
          jumper={jumper}
          pageInfo={`${String(i + 1).padStart(2, '0')} / ${String(jumps.length).padStart(2, '0')}`}
          exportedAt={exportedAt}
        />
      ))}
    </Document>
  )
}
