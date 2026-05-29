import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

type CategoryKey = 'bug' | 'feature' | 'account' | 'other';

interface Category {
  key: CategoryKey;
  label: string;
  icon: string;
  hint: string; // shown as a note under the message box
}

const CATEGORIES: Category[] = [
  {
    key: 'bug',
    label: 'Bug report',
    icon: 'bug-outline',
    hint: 'Please include: your device model & OS version, whether you were on Wi-Fi or mobile data, your carrier / service provider, and the exact steps to reproduce the issue.',
  },
  {
    key: 'feature',
    label: 'Feature request',
    icon: 'bulb-outline',
    hint: 'Describe the feature, why it would be useful to you, and any similar apps or examples you have in mind.',
  },
  {
    key: 'account',
    label: 'Account / billing',
    icon: 'card-outline',
    hint: 'Include the email address on your account and a clear description of the issue so we can look it up quickly.',
  },
  {
    key: 'other',
    label: 'Other',
    icon: 'chatbubble-ellipses-outline',
    hint: 'Tell us anything — we read every message.',
  },
];

// ─── DB mapping ─────────────────────────────────────────────────────────────────

// Map mobile category keys → support_ticket_category_enum values
const CATEGORY_TO_DB: Record<CategoryKey, string> = {
  bug:     'bug',
  feature: 'feature',
  account: 'billing',
  other:   'support',
};

const CATEGORY_TO_SUBJECT: Record<CategoryKey, string> = {
  bug:     'Bug report',
  feature: 'Feature request',
  account: 'Account / billing enquiry',
  other:   'General enquiry',
};

// ─── Bug detail fields ────────────────────────────────────────────────────────

const BUG_FIELDS: { key: string; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'device',    label: 'DEVICE & OS',        placeholder: 'e.g. iPhone 15 Pro, iOS 17.4' },
  { key: 'network',   label: 'CONNECTION TYPE',     placeholder: 'Wi-Fi or Mobile data' },
  { key: 'carrier',   label: 'CARRIER / PROVIDER',  placeholder: 'e.g. Telstra, Optus, AT&T' },
  { key: 'steps',     label: 'STEPS TO REPRODUCE',  placeholder: '1. Open the app\n2. Navigate to…\n3. Tap…\n4. Expected X, got Y', multiline: true },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContactScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [category, setCategory] = useState<CategoryKey>('bug');
  const [message, setMessage] = useState('');
  const [bugDetails, setBugDetails] = useState<Record<string, string>>({
    device: '', network: '', carrier: '', steps: '',
  });
  const [sending, setSending] = useState(false);

  const selectedCategory = CATEGORIES.find(c => c.key === category)!;

  const handleSend = async () => {
    if (!message.trim() && category !== 'bug') {
      Alert.alert('Message required', 'Please describe your issue or request before sending.');
      return;
    }
    if (category === 'bug' && !message.trim() && !bugDetails.steps.trim()) {
      Alert.alert('More info needed', 'Please describe the bug and fill in at least the reproduction steps.');
      return;
    }

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }

      // Build the full message body
      let body = message.trim();
      if (category === 'bug') {
        const extras = BUG_FIELDS
          .filter(f => bugDetails[f.key]?.trim())
          .map(f => `${f.label}: ${bugDetails[f.key].trim()}`)
          .join('\n');
        if (extras) body = body ? `${body}\n\n${extras}` : extras;
      }

      // Look up full name from profile
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle();

      const { error: insertError } = await supabase.from('support_tickets').insert({
        user_id:  user.id,
        name:     profile?.full_name ?? null,
        email:    user.email ?? null,
        subject:  CATEGORY_TO_SUBJECT[category],
        category: CATEGORY_TO_DB[category],
        message:  body,
        status:   'open',
        severity: 'normal',
        source:   'mobile',
      });
      if (insertError) throw insertError;

      Alert.alert(
        'Message sent',
        "Thanks for reaching out — we'll get back to you as soon as possible.",
        [{ text: 'Done', onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact us</Text>
        <TouchableOpacity onPress={handleSend} disabled={sending} activeOpacity={0.7}>
          {sending
            ? <ActivityIndicator size="small" color={colors.sky} />
            : <Text style={styles.sendBtn}>Send</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Category pills */}
          <Text style={styles.sectionLabel}>WHAT CAN WE HELP WITH?</Text>
          <View style={styles.pillRow}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.pill, category === c.key && styles.pillActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={c.icon as any}
                  size={14}
                  color={category === c.key ? colors.onSky : colors.fg2}
                  style={{ marginRight: spacing[1] }}
                />
                <Text style={[styles.pillText, category === c.key && styles.pillTextActive]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bug-specific structured fields */}
          {category === 'bug' && (
            <>
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={15} color={colors.sky} style={{ marginTop: 1 }} />
                <Text style={styles.infoBannerText}>
                  The more detail you include, the faster we can track it down. Fill in as many fields as you can.
                </Text>
              </View>

              {BUG_FIELDS.map(f => (
                <View key={f.key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, f.multiline && styles.inputMulti]}
                    value={bugDetails[f.key]}
                    onChangeText={v => setBugDetails(d => ({ ...d, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.fg3}
                    multiline={f.multiline}
                    autoCorrect={false}
                    autoCapitalize={f.multiline ? 'sentences' : 'none'}
                    textAlignVertical={f.multiline ? 'top' : 'center'}
                  />
                </View>
              ))}
            </>
          )}

          {/* Message field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              {category === 'bug' ? 'ANYTHING ELSE TO ADD?' : 'YOUR MESSAGE'}
            </Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={message}
              onChangeText={setMessage}
              placeholder={
                category === 'bug'
                  ? 'Any extra context, screenshots descriptions, or observations…'
                  : 'Describe your issue or request in as much detail as possible…'
              }
              placeholderTextColor={colors.fg3}
              multiline
              autoCorrect={false}
              autoCapitalize="sentences"
              textAlignVertical="top"
            />
            {/* Per-category hint note */}
            <View style={styles.hintRow}>
              <Ionicons name="information-circle-outline" size={13} color={colors.fg3} style={{ marginTop: 1 }} />
              <Text style={styles.hintText}>{selectedCategory.hint}</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },

    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: spacing[5], paddingVertical: spacing[4],
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    back: { padding: spacing[1] },
    headerTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
    sendBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.sky },

    body: { paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[12] },

    sectionLabel: {
      fontFamily: 'InterTight-SemiBold', fontSize: 11, color: c.fg3,
      letterSpacing: 0.6, marginBottom: spacing[3],
    },

    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[5] },
    pill: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: spacing[3], paddingVertical: spacing[1.5],
      borderRadius: radii.pill, borderWidth: 1,
      backgroundColor: c.surface, borderColor: c.border,
    },
    pillActive: { backgroundColor: c.sky, borderColor: c.sky },
    pillText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
    pillTextActive: { color: c.onSky },

    infoBanner: {
      flexDirection: 'row', alignItems: 'flex-start', gap: spacing[2],
      backgroundColor: `${c.sky}18`, borderWidth: 1, borderColor: `${c.sky}30`,
      borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[4],
    },
    infoBannerText: { flex: 1, fontFamily: 'InterTight-Regular', fontSize: 13, color: c.sky, lineHeight: 18 },

    fieldGroup: { marginBottom: spacing[4] },
    fieldLabel: {
      fontFamily: 'InterTight-SemiBold', fontSize: 11, color: c.fg3,
      letterSpacing: 0.6, marginBottom: spacing[2],
    },
    input: {
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
      borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3],
      fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg,
      minHeight: 46,
    },
    inputMulti: { minHeight: 120, paddingTop: spacing[3] },

    hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[1.5], marginTop: spacing[2] },
    hintText: { flex: 1, fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, lineHeight: 17 },
  });
}
