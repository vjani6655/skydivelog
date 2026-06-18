import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useMemo } from 'react'
import { useColors } from '@/lib/theme'
import { spacing, radii } from '@/constants/tokens'

type ChangeCategory = 'New' | 'Fix' | 'Improvement'

interface ReleaseChange {
  category: ChangeCategory
  text: string
}

export interface ReleaseNote {
  id: string
  build_number: number
  version: string
  title: string | null
  changes: ReleaseChange[]
  published_at: string | null
}

interface Props {
  releases: ReleaseNote[]
  onDismiss: () => void
}

function parseInline(text: string): { text: string; bold: boolean; italic: boolean }[] {
  const out: { text: string; bold: boolean; italic: boolean }[] = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let last = 0, m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), bold: false, italic: false })
    if (m[0].startsWith('**')) out.push({ text: m[2], bold: true, italic: false })
    else                       out.push({ text: m[3], bold: false, italic: true })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), bold: false, italic: false })
  return out.length ? out : [{ text, bold: false, italic: false }]
}

function MarkdownBlock({ text, baseStyle }: { text: string; baseStyle: object }) {
  const lines = text.split('\n')
  return (
    <View style={{ gap: 3 }}>
      {lines.map((line, li) => {
        const isH2 = line.startsWith('## ')
        const isH3 = line.startsWith('### ')
        const isBullet = line.startsWith('- ') || line.startsWith('* ')
        const content = isH2 ? line.slice(3) : isH3 ? line.slice(4) : isBullet ? line.slice(2) : line
        if (!content.trim()) return <View key={li} style={{ height: 2 }} />
        const segments = parseInline(content)
        if (isH2) {
          return (
            <Text key={li} style={[baseStyle, { fontFamily: 'InterTight-Bold', fontSize: 15, marginTop: 10, marginBottom: 2 }]}>
              {content}
            </Text>
          )
        }
        if (isH3) {
          return (
            <Text key={li} style={[baseStyle, { fontFamily: 'InterTight-SemiBold', fontSize: 13, marginTop: 8, marginBottom: 1, opacity: 0.7 }]}>
              {content}
            </Text>
          )
        }
        if (isBullet) {
          return (
            <View key={li} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 4 }}>
              <Text style={[baseStyle, { marginRight: 8, marginTop: 1, opacity: 0.5 }]}>{'·'}</Text>
              <Text style={[baseStyle, { flex: 1 }]}>
                {segments.map((seg, si) => (
                  <Text key={si} style={
                    seg.bold ? { fontFamily: 'InterTight-SemiBold' } :
                    seg.italic ? { fontStyle: 'italic' } : undefined
                  }>{seg.text}</Text>
                ))}
              </Text>
            </View>
          )
        }
        return (
          <Text key={li} style={baseStyle}>
            {segments.map((seg, si) => (
              <Text key={si} style={
                seg.bold ? { fontFamily: 'InterTight-SemiBold' } :
                seg.italic ? { fontStyle: 'italic' } : undefined
              }>{seg.text}</Text>
            ))}
          </Text>
        )
      })}
    </View>
  )
}

function categoryMeta(cat: ChangeCategory, colors: ReturnType<typeof useColors>) {
  switch (cat) {
    case 'New':         return { bg: colors.ok + '22',   text: colors.ok,   label: 'NEW' }
    case 'Fix':         return { bg: colors.warn + '22', text: colors.warn, label: 'FIX' }
    case 'Improvement': return { bg: colors.sky + '22',  text: colors.sky,  label: 'IMPROVED' }
  }
}

export default function WhatsNewModal({ releases, onDismiss }: Props) {
  const colors = useColors()
  const styles = useMemo(() => makeStyles(colors), [colors])

  if (releases.length === 0) return null

  const latestVersion = releases[0].version

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>What's New</Text>
            <Text style={styles.subtitle}>
              {releases.length === 1
                ? `Version ${latestVersion} (${releases[0].build_number})`
                : `Versions ${releases[releases.length - 1].version} – ${latestVersion}`}
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {releases.map((release, ri) => (
              <View key={release.id} style={[styles.releaseBlock, ri > 0 && styles.releaseBlockBorder]}>
                {releases.length > 1 && (
                  <Text style={styles.versionLabel}>v{release.version} · Build {release.build_number}</Text>
                )}
                {release.title && (
                  <Text style={styles.releaseTitle}>{release.title}</Text>
                )}
                {release.changes.map((ch, ci) => {
                  const meta = categoryMeta(ch.category, colors)
                  const isOnly = release.changes.length === 1
                  return (
                    <View key={ci} style={[styles.changeBlock, ci > 0 && styles.changeBlockSep]}>
                      {!isOnly && (
                        <View style={[styles.catBadge, { backgroundColor: meta.bg }]}>
                          <Text style={[styles.catText, { color: meta.text }]}>{meta.label}</Text>
                        </View>
                      )}
                      <MarkdownBlock text={ch.text} baseStyle={styles.bodyText} />
                    </View>
                  )
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.8}>
              <Text style={styles.btnText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      height: '88%',
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.border,
      alignSelf: 'center',
      marginTop: spacing[3],
    },
    header: {
      alignItems: 'center',
      paddingHorizontal: spacing[6],
      paddingTop: spacing[4],
      paddingBottom: spacing[4],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    title: {
      fontFamily: 'InterTight-Bold',
      fontSize: 20,
      color: c.fg,
    },
    subtitle: {
      fontFamily: 'InterTight-Regular',
      fontSize: 13,
      color: c.fg3,
      marginTop: 3,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[4],
      paddingBottom: spacing[6],
    },
    releaseBlock: {
      paddingBottom: spacing[4],
    },
    releaseBlockBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: spacing[4],
    },
    versionLabel: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      letterSpacing: 0.8,
      color: c.fg3,
      marginBottom: spacing[2],
    },
    releaseTitle: {
      fontFamily: 'InterTight-Bold',
      fontSize: 17,
      color: c.fg,
      marginBottom: spacing[3],
    },
    changeBlock: {
      gap: spacing[2],
    },
    changeBlockSep: {
      marginTop: spacing[3],
      paddingTop: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    catBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 4,
    },
    catText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.8,
    },
    bodyText: {
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      color: c.fg2,
      lineHeight: 21,
    },
    footer: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[3],
      paddingBottom: 34,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    btn: {
      backgroundColor: c.sky,
      borderRadius: radii.md,
      paddingVertical: spacing[3.5],
      alignItems: 'center',
    },
    btnText: {
      fontFamily: 'InterTight-SemiBold',
      fontSize: 16,
      color: '#fff',
    },
  })
}
