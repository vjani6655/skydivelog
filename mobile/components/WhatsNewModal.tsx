import { Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { useMemo, Fragment } from 'react'
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

// Simple markdown renderer — handles **bold**, *italic*, and - bullet lines
function MarkdownText({ text, style }: { text: string; style: object }) {
  const lines = text.split('\n')
  return (
    <View style={{ gap: 2 }}>
      {lines.map((line, li) => {
        const isBullet = line.startsWith('- ') || line.startsWith('* ')
        const content = isBullet ? line.slice(2) : line
        const segments = parseInline(content)
        return (
          <View key={li} style={isBullet ? { flexDirection: 'row', alignItems: 'flex-start' } : undefined}>
            {isBullet && <Text style={[style, { marginRight: 6, marginTop: 1 }]}>{'•'}</Text>}
            <Text style={[style, { flex: isBullet ? 1 : undefined }]}>
              {segments.map((seg, si) => (
                <Text
                  key={si}
                  style={[
                    seg.bold && seg.italic ? { fontFamily: 'InterTight-Bold' } :
                    seg.bold   ? { fontFamily: 'InterTight-SemiBold' } :
                    seg.italic ? { fontStyle: 'italic' } : undefined
                  ]}
                >
                  {seg.text}
                </Text>
              ))}
            </Text>
          </View>
        )
      })}
    </View>
  )
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

function categoryStyle(cat: ChangeCategory, colors: ReturnType<typeof useColors>) {
  switch (cat) {
    case 'New':         return { bg: colors.ok + '1A',  text: colors.ok,   label: 'NEW' }
    case 'Fix':         return { bg: colors.warn + '1A', text: colors.warn, label: 'FIX' }
    case 'Improvement': return { bg: colors.sky + '1A',  text: colors.sky,  label: 'IMPROVED' }
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
        <View style={styles.sheet} pointerEvents="box-none">
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>🎉</Text>
            <Text style={styles.title}>What's New</Text>
            <Text style={styles.subtitle}>
              {releases.length === 1
                ? `Version ${latestVersion}`
                : `Versions ${releases[releases.length - 1].version} – ${latestVersion}`}
            </Text>
          </View>

          {/* Changes */}
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
                {release.title && releases.length === 1 && (
                  <Text style={styles.releaseTitle}>{release.title}</Text>
                )}
                {release.changes.map((ch, ci) => {
                  const cat = categoryStyle(ch.category, colors)
                  return (
                    <View key={ci} style={styles.changeRow}>
                      <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                        <Text style={[styles.catText, { color: cat.text }]}>{cat.label}</Text>
                      </View>
                      <MarkdownText text={ch.text} style={styles.changeText} />
                    </View>
                  )
                })}
              </View>
            ))}
          </ScrollView>

          {/* Dismiss */}
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
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      maxHeight: '88%',
      flexShrink: 1,
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
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    emoji: {
      fontSize: 36,
      marginBottom: spacing[2],
    },
    title: {
      fontFamily: 'InterTight-Bold',
      fontSize: 22,
      color: c.fg,
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: 'InterTight-Regular',
      fontSize: 13,
      color: c.fg3,
      marginTop: 4,
      textAlign: 'center',
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing[5],
      paddingVertical: spacing[4],
    },
    releaseBlock: {
      paddingBottom: spacing[4],
    },
    releaseBlockBorder: {
      borderTopWidth: 1,
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
      fontFamily: 'InterTight-SemiBold',
      fontSize: 15,
      color: c.fg,
      marginBottom: spacing[3],
    },
    changeRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing[2],
      marginBottom: spacing[2.5],
    },
    catBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      flexShrink: 0,
      marginTop: 1,
    },
    catText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9,
      letterSpacing: 0.6,
    },
    changeText: {
      fontFamily: 'InterTight-Regular',
      fontSize: 14,
      color: c.fg2,
      flex: 1,
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: spacing[5],
      paddingTop: spacing[3],
      paddingBottom: 34,
      borderTopWidth: 1,
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
