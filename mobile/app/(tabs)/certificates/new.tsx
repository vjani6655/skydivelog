import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';

const CATEGORIES: { key: 'licence' | 'rating' | 'medical' | 'other'; label: string }[] = [
  { key: 'licence', label: 'Licence' },
  { key: 'rating', label: 'Rating' },
  { key: 'medical', label: 'Medical' },
];

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function DateField({ label, value, onChange, optional }: {
  label: string; value: Date | null; onChange: (d: Date) => void; optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const display = value
    ? value.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : optional ? '—' : 'Tap to select';

  const confirm = () => { onChange(draft); setOpen(false); };
  const cancel = () => { setDraft(value ?? new Date()); setOpen(false); };

  return (
    <View style={styles.flex}>
      <Label text={label} />
      <TouchableOpacity style={styles.dateBtn} onPress={() => { setDraft(value ?? new Date()); setOpen(true); }} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={15} color={value ? colors.fg : colors.fg3} style={{ marginRight: spacing[2] }} />
        <Text style={[styles.dateBtnText, !value && { color: colors.fg3 }]}>{display}</Text>
      </TouchableOpacity>
      <Modal transparent animationType="slide" visible={open} onRequestClose={cancel}>
        <TouchableOpacity style={styles.dateModalOverlay} activeOpacity={1} onPress={cancel}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.dateModalSheet}>
              <View style={styles.dateModalToolbar}>
                <TouchableOpacity onPress={cancel} style={styles.dateModalToolbarBtn}>
                  <Text style={styles.dateModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.dateModalTitle}>{label.charAt(0) + label.slice(1).toLowerCase()}</Text>
                <TouchableOpacity onPress={confirm} style={styles.dateModalToolbarBtn}>
                  <Text style={styles.dateModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                onChange={(_, selected) => { if (selected) setDraft(selected); }}
                textColor={colors.fg}
                themeVariant="dark"
                style={{ height: 216 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function NewCertificateScreen() {
  const [category, setCategory] = useState<'licence' | 'rating' | 'medical' | 'other'>('licence');
  const [title, setTitle] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [issuedDate, setIssuedDate] = useState<Date | null>(new Date());
  const [expiresDate, setExpiresDate] = useState<Date | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { Alert.alert('Title required', 'Please enter a certificate title.'); return; }
    if (!issuingBody.trim()) { Alert.alert('Issuing body required', 'Please enter the issuing body.'); return; }
    if (!issuedDate) { Alert.alert('Issue date required', 'Please select an issue date.'); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }
      const { error } = await supabase.from('certificates').insert({
        user_id: user.id,
        category,
        title: title.trim(),
        issuing_body: issuingBody.trim(),
        issued_date: issuedDate.toISOString().slice(0, 10),
        expires_date: expiresDate ? expiresDate.toISOString().slice(0, 10) : null,
        reference_number: referenceNumber.trim() || null,
      });
      if (error) { Alert.alert('Error saving certificate', error.message); return; }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.close} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add certificate</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>CATEGORY</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.catCard, category === c.key && styles.catCardActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catLabel, category === c.key && styles.catLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Label text="TITLE" />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={
              category === 'licence' ? 'B Licence, C Licence, D Licence' :
              category === 'rating'  ? 'AFF Instructor, Coach 1, Tandem Instructor' :
              'Class 1 Medical, Fitness Declaration'
            }
            placeholderTextColor={colors.fg3}
            autoCapitalize="words"
          />

          <Label text="ISSUING BODY" />
          <TextInput
            style={styles.input}
            value={issuingBody}
            onChangeText={setIssuingBody}
            placeholder={
              category === 'medical' ? 'CASA, CAA, FAA' : 'APF, USPA, BPA'
            }
            placeholderTextColor={colors.fg3}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={styles.row2}>
            <DateField label="ISSUED" value={issuedDate} onChange={setIssuedDate} />
            <DateField label="EXPIRES" value={expiresDate} onChange={setExpiresDate} optional />
          </View>

          <Label text="REFERENCE / NUMBER" />
          <TextInput
            style={styles.input}
            value={referenceNumber}
            onChangeText={setReferenceNumber}
            placeholder={
              category === 'licence' ? 'APF-12345' :
              category === 'rating'  ? 'APF-R-001' :
              'CASA-M-12345'
            }
            placeholderTextColor={colors.fg3}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.attachRow}>
            <View style={styles.attachInfo}>
              <Text style={styles.attachTitle}>Attach document</Text>
              <Text style={styles.attachSub}>PDF or image.</Text>
            </View>
            <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.7}>
              <Text style={styles.uploadBtnText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  close: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg },
  saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.sky },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[2] },
  catGrid: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] },
  catCard: { flex: 1, paddingVertical: spacing[3.5], borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  catCardActive: { borderColor: colors.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
  catLabel: { fontFamily: 'InterTight-Medium', fontSize: 13, color: colors.fg2 },
  catLabelActive: { color: colors.sky },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg },
  row2: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[1] },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4] },
  dateBtnText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg, flex: 1 },
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dateModalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', paddingBottom: spacing[8] },
  dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  dateModalToolbarBtn: { minWidth: 60 },
  dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.fg },
  dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg2 },
  dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.sky, textAlign: 'right' },
  attachRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[4], marginBottom: spacing[4] },
  attachInfo: { flex: 1 },
  attachTitle: { fontFamily: 'InterTight-Medium', fontSize: 15, color: colors.fg },
  attachSub: { fontFamily: 'InterTight-Regular', fontSize: 13, color: colors.fg3, marginTop: 2 },
  uploadBtn: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  uploadBtnText: { fontFamily: 'InterTight-SemiBold', fontSize: 13, color: colors.fg },
});
