/**
 * Pdf10C — 5×2 Journal Cards layout
 * 10 jumps per A4 page. Each jump is a card with telemetry + notes + sign line.
 */
import React from 'react'
import {
  Document, Page, View, Text, StyleSheet, Font, Svg, Path,
} from '@react-pdf/renderer'
import path from 'path'
import type { JumperProfile, PdfJump } from './types'
import { fmtDateShort, fmtMSS, fmtExportedAt, fmtTotalTime, truncate } from './helpers'

// ─── Fonts (registered once; react-pdf deduplicates) ─────────────────────────

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

// ─── Tokens ───────────────────────────────────────────────────────────────────

const PAPER        = '#FAFAF7'
const CREAM        = '#F5F3EE'
const INK          = '#0A1220'
const INK_2        = '#3D4E6A'
const INK_3        = '#7F8B9D'
const INK_4        = '#B6BCC6'
const RULE         = '#D8D4C8'
const HIGHLIGHT_BG = '#FFF4D6'
const HIGHLIGHT_FG = '#7A4C00'
const PASS_BG      = '#E8F5E9'
const PASS_FG      = '#2E7D32'
const REPEAT_BG    = '#FFF3E0'
const REPEAT_FG    = '#E65100'

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  ui:   { fontFamily: 'InterTight' },
  mono: { fontFamily: 'JetBrainsMono' },
  page: {
    backgroundColor: PAPER,
    color: INK,
    fontFamily: 'InterTight',
    fontSize: 11,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  footer: {
    position: 'absolute',
    left: 40,
    right: 40,
    bottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: RULE,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontFamily: 'JetBrainsMono',
    fontSize: 7.5,
    color: INK_3,
    letterSpacing: 0.7,
  },
})

// ─── Local helpers ───────────────────────────────────────────────────────────

/** Format altitude in feet as compact string. < 1 000 ft → raw number; ≥ 1 000 ft → Xk / X.Xk */
function fmtKft(ft: number | null): string {
  if (!ft) return '—'
  if (ft < 1000) return `${ft}`
  const k = ft / 1000
  return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1)}k`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const PageHeader = ({
  title, sub, pageInfo, jumper,
}: {
  title: string; sub: string; pageInfo: string; jumper: JumperProfile
}) => (
  <View style={s.header}>
    <View>
      <Text style={[s.ui, { fontSize: 11, fontWeight: 700, letterSpacing: -0.1 }]}>Jump Logs</Text>
      <Text style={[s.mono, { fontSize: 7, color: INK_3, letterSpacing: 0.8, marginTop: 1 }]}>
        OFFICIAL LOGBOOK EXTRACT · {jumper.licence_number ?? 'UNLICENSED'}
      </Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <Text style={[s.ui, { fontSize: 9, fontWeight: 600 }]}>{title}</Text>
      <Text style={[s.mono, { fontSize: 7, color: INK_3, letterSpacing: 0.7, marginTop: 2 }]}>
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

// ─── Per-jump card ────────────────────────────────────────────────────────────

function JumpCard({ jump }: { jump: PdfJump }) {
  const isStudent = jump.jumper_type === 'student'
  const signed    = !!jump.signer_name
  const signerLabel = signed
    ? `${jump.signer_name} · ${jump.signer_licence_number}`
    : '—'
  const acLabel = [jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(' · ')

  const telCells = [
    ['EXIT',   fmtKft(jump.exit_altitude_ft),   'ft'],
    ['PULL',   fmtKft(jump.pull_altitude_ft),   'ft'],
    ['FF',     jump.freefall_seconds   ? `${jump.freefall_seconds}`                                    : '—', 's'],
    ['CANOPY', fmtMSS(jump.canopy_seconds), ''],
    ['ACC',    jump.landing_accuracy_value ? `${jump.landing_accuracy_value}${jump.landing_accuracy_unit ?? ''}` : '—', ''],
  ] as const

  return (
    <View style={{
      width: '49.3%',
      minHeight: 200,
      borderWidth: 1,
      borderColor: RULE,
      borderRadius: 4,
      padding: 8,
      backgroundColor: PAPER,
      flexDirection: 'column',
    }}>
      {/* Card header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: RULE,
        paddingBottom: 4,
        marginBottom: 5,
        gap: 4,
      }}>
        {/* Left: number + type + student badge */}
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
          <Text style={[s.mono, { fontSize: 13, fontWeight: 600, lineHeight: 1, letterSpacing: -0.2 }]}>
            {jump.jump_number}
          </Text>
          <Text style={[s.ui, { fontSize: 10, fontWeight: 600, lineHeight: 1.1 }]}>
            {jump.jump_type ?? '—'}
          </Text>
          {isStudent && (
            <View style={{
              backgroundColor: HIGHLIGHT_BG,
              paddingHorizontal: 5,
              paddingVertical: 1,
              borderRadius: 2,
              maxWidth: 120,
            }}>
              <Text style={[s.mono, { fontSize: 7, letterSpacing: 0.8, color: HIGHLIGHT_FG }]}>
                {'STUDENT'}{jump.jump_stage ? ` · ${truncate(jump.jump_stage.toUpperCase(), 18)}` : (jump.jump_type ? ` · ${jump.jump_type.toUpperCase()}` : '')}
              </Text>
            </View>
          )}
        </View>
        {/* Right: date · dz */}
        <Text style={[s.mono, { fontSize: 7, color: INK_3, flexShrink: 0, textAlign: 'right' }]}>
          {fmtDateShort(jump.date)}{`\n`}{(jump.dz_name ?? '—').toUpperCase()}
        </Text>
      </View>

      {/* Telemetry row — 5 equal columns */}
      <View style={{
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: RULE,
        paddingBottom: 4,
        marginBottom: 4,
      }}>
        {telCells.map(([label, val, unit]) => (
          <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[s.mono, { fontSize: 6.5, color: INK_3, letterSpacing: 0.5 }]}>{label}</Text>
            <Text style={[s.mono, { fontSize: 9, fontWeight: 500, marginTop: 1 }]}>
              {val}
              {unit ? <Text style={{ color: INK_3 }}>{unit}</Text> : null}
            </Text>
          </View>
        ))}
      </View>

      {/* Aircraft + Canopy type */}
      <Text style={[s.mono, { fontSize: 7, color: INK_3, letterSpacing: 0.4, marginBottom: jump.canopy_type ? 1 : 3 }]}>
        {acLabel.toUpperCase() || '—'}
      </Text>
      {jump.canopy_type ? (
        <Text style={[s.mono, { fontSize: 7, color: INK_2, letterSpacing: 0.4, marginBottom: 3 }]}>
          {'CANOPY: '}{jump.canopy_type.toUpperCase()}
        </Text>
      ) : null}
      {jump.people_on_jump != null ? (
        <Text style={[s.mono, { fontSize: 7, color: INK_2, letterSpacing: 0.4, marginBottom: 3 }]}>
          {'PEOPLE: '}{jump.people_on_jump}
        </Text>
      ) : null}

      {/* Description of jump — fixed height, clipped */}
      <View style={{ flex: 1, overflow: 'hidden', minHeight: 18 }}>
        {jump.notes ? (
          <Text style={[s.ui, {
            fontSize: 8.5,
            color: INK_2,
            lineHeight: 1.4,
          }]}>
            &ldquo;{truncate(jump.notes, 120)}&rdquo;
          </Text>
        ) : null}
      </View>

      {/* Signature overlay — bottom-right, 60% opacity */}
      {jump.signer_signature_data && (
        <View style={{
          position: 'absolute',
          bottom: 24,
          right: 6,
          width: 72,
          height: 36,
          opacity: 0.6,
        }}>
          <Svg viewBox="0 0 320 200" width={72} height={36}>
            <Path
              d={jump.signer_signature_data}
              stroke={INK_3}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      )}

      {/* Sign line */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 3,
        paddingTop: 3,
        borderTopWidth: 1,
        borderTopColor: RULE,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, flex: 1 }}>
          <Text style={[s.mono, { fontSize: 6.5, color: INK_3, letterSpacing: 0.7 }]}>SIGNED BY</Text>
          <Text style={[s.mono, {
            fontSize: 7.5,
            color: signed ? INK_2 : INK_4,
            flex: 1,
          }]}>
            {truncate(signerLabel, 40)}
          </Text>
        </View>
        {isStudent && jump.signer_outcome === 'pass' && (
          <View style={{ backgroundColor: PASS_BG, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginLeft: 6 }}>
            <Text style={[s.mono, { fontSize: 7, letterSpacing: 0.8, color: PASS_FG }]}>PASS</Text>
          </View>
        )}
        {isStudent && jump.signer_outcome === 'repeat' && (
          <View style={{ backgroundColor: REPEAT_BG, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3, marginLeft: 6 }}>
            <Text style={[s.mono, { fontSize: 7, letterSpacing: 0.8, color: REPEAT_FG }]}>REPEAT</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Per-page component ───────────────────────────────────────────────────────

function TenPage({
  jumps, jumper, pageInfo, exportedAt, firstJumpNum, lastJumpNum,
}: {
  jumps: PdfJump[]
  jumper: JumperProfile
  pageInfo: string
  exportedAt: string
  firstJumpNum: number
  lastJumpNum: number
}) {
  // Pair jumps into rows of 2
  const rows: Array<[PdfJump, PdfJump | null]> = []
  for (let i = 0; i < jumps.length; i += 2) {
    rows.push([jumps[i], jumps[i + 1] ?? null])
  }

  return (
    <Page size="A4" style={s.page}>
      <PageHeader
        title={`Logbook · jumps ${firstJumpNum} — ${lastJumpNum}`}
        sub={`${jumps.length} ENTRIES`}
        pageInfo={pageInfo}
        jumper={jumper}
      />

      {/* Jumper + stats strip */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: 40,
        marginTop: 8,
        marginBottom: 6,
        padding: 8,
        backgroundColor: CREAM,
        borderWidth: 1,
        borderColor: RULE,
        borderRadius: 4,
      }}>
        <View>
          <Text style={[s.ui, { fontSize: 11, fontWeight: 600 }]}>{jumper.full_name}</Text>
          <Text style={[s.mono, { fontSize: 7.5, color: INK_3, marginTop: 2, letterSpacing: 0.4 }]}>
            {[jumper.licence_number, jumper.licence_rating, jumper.home_dz].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 20 }}>
          {[
            ['TOTAL JUMPS', String(jumper.total_jumps)],
            ['FREEFALL',    fmtTotalTime(jumper.total_ff_seconds)],
            ['CANOPY',      fmtTotalTime(jumper.total_canopy_seconds)],
          ].map(([label, val]) => (
            <View key={label} style={{ alignItems: 'flex-end' }}>
              <Text style={[s.mono, { fontSize: 7, color: INK_3, letterSpacing: 0.7 }]}>{label}</Text>
              <Text style={[s.mono, { fontSize: 13, fontWeight: 500 }]}>{val}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Card grid */}
      <View style={{ paddingHorizontal: 40 }}>
        {rows.map(([left, right], ri) => (
          <View key={ri} style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
            <JumpCard jump={left} />
            {right ? <JumpCard jump={right} /> : <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>

      <PageFooter exportedAt={exportedAt} />
    </Page>
  )
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function TenDocument({
  jumps,
  jumper,
}: {
  jumps: PdfJump[]
  jumper: JumperProfile
}) {
  const exportedAt = fmtExportedAt()

  // Chunk into pages of 6
  const pages: PdfJump[][] = []
  for (let i = 0; i < jumps.length; i += 6)
    pages.push(jumps.slice(i, i + 6))
  const totalPages = pages.length

  return (
    <Document
      title={`Jump Logs — ${jumper.full_name} Logbook`}
      author="Jump Logs"
      creator="jumplogs.com"
    >
      {pages.map((pageJumps, pi) => (
        <TenPage
          key={pi}
          jumps={pageJumps}
          jumper={jumper}
          pageInfo={`${String(pi + 1).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}`}
          exportedAt={exportedAt}
          firstJumpNum={pageJumps[0].jump_number}
          lastJumpNum={pageJumps[pageJumps.length - 1].jump_number}
        />
      ))}
    </Document>
  )
}
