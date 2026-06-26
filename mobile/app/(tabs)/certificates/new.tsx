import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const CATEGORIES: { key: 'licence' | 'rating' | 'medical' | 'other'; label: string }[] = [
  { key: 'licence', label: 'Licence' },
  { key: 'rating', label: 'Rating' },
  { key: 'medical', label: 'Medical' },
];

function Label({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

function DateField({ label, value, onChange, optional, error, minimumDate }: {
  label: string; value: Date | null; onChange: (d: Date) => void; optional?: boolean; error?: string; minimumDate?: Date | null;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const display = value
    ? value.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : optional ? '—' : 'Tap to select';

  const confirm = () => { onChange(draft); setOpen(false); };
  const cancel = () => { setDraft(value ?? new Date()); setOpen(false); };

  if (Platform.OS === 'android') {
    return (
      <View style={styles.flex}>
        <Label text={label} />
        <TouchableOpacity style={[styles.dateBtn, !!error && { borderColor: colors.danger }]} onPress={() => { setDraft(value ?? (minimumDate ?? new Date())); setOpen(true); }} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={15} color={value ? colors.fg : colors.fg3} style={{ marginRight: spacing[2] }} />
          <Text style={[styles.dateBtnText, !value && { color: colors.fg3 }]}>{display}</Text>
        </TouchableOpacity>
        {!!error && <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.danger, marginTop: 4, marginBottom: spacing[1] }}>{error}</Text>}
        {open && (
          <DateTimePicker value={draft} mode="date" display="default"
            onChange={(_, selected) => { setOpen(false); if (selected) { setDraft(selected); onChange(selected); } }}
            minimumDate={minimumDate ?? undefined} />
        )}
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <Label text={label} />
      <TouchableOpacity style={[styles.dateBtn, !!error && { borderColor: colors.danger }]} onPress={() => { setDraft(value ?? (minimumDate ?? new Date())); setOpen(true); }} activeOpacity={0.7}>
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
                minimumDate={minimumDate ?? undefined}
                textColor={colors.fg}
                themeVariant="dark"
                style={{ height: 216 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      {!!error && <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.danger, marginTop: 4, marginBottom: spacing[1] }}>{error}</Text>}
    </View>
  );
}

function hasFormData(title: string, issuingBody: string, referenceNumber: string): boolean {
  return title.trim().length > 0 || issuingBody.trim().length > 0 || referenceNumber.trim().length > 0;
}

export default function NewCertificateScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [category, setCategory] = useState<'licence' | 'rating' | 'medical' | 'other'>('licence');
  const [title, setTitle] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [issuedDate, setIssuedDate] = useState<Date | null>(new Date());
  const [expiresDate, setExpiresDate] = useState<Date | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [certReminderDays, setCertReminderDays] = useState(30);
  const [errors, setErrors] = useState<{
    title?: string;
    issuingBody?: string;
    issuedDate?: string;
    expiresDate?: string;
  }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      supabase.from('users').select('cert_expiry_warning_days').eq('id', session.user.id).single().then(({ data }) => {
        if (data?.cert_expiry_warning_days != null) setCertReminderDays(data.cert_expiry_warning_days);
      });
    });
  }, []);

  const clearError = (field: string) => setErrors(e => ({ ...e, [field]: undefined }));

  const clearForm = () => {
    setTitle('');
    setIssuingBody('');
    setIssuedDate(new Date());
    setExpiresDate(null);
    setReferenceNumber('');
    setDocumentUri(null);
    setDocumentName(null);
    setErrors({});
  };

  const confirmSwitch = (newCategory: typeof category) => {
    if (category !== newCategory && hasFormData(title, issuingBody, referenceNumber)) {
      Alert.alert(
        'Unsaved changes',
        'Your data will be lost if you switch category. Save first or discard.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard & switch', style: 'destructive', onPress: () => { clearForm(); setCategory(newCategory); } },
        ],
      );
    } else {
      setCategory(newCategory);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.size !== undefined && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose an image under 10 MB.');
        return;
      }
      setDocumentUri(asset.uri);
      setDocumentName(asset.name ?? 'photo');
    } catch {
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  const handleSave = async () => {
    const errs: { title?: string; issuingBody?: string; issuedDate?: string; expiresDate?: string } = {};
    if (!title.trim())        errs.title        = 'Title is required';
    if (!issuingBody.trim()) errs.issuingBody   = 'Issuing body is required';
    if (!issuedDate)         errs.issuedDate    = 'Issue date is required';
    if (expiresDate && issuedDate && expiresDate <= issuedDate)
      errs.expiresDate = 'Expiry must be after the issue date';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }

      let documentFileUrl: string | null = null;
      if (documentUri) {
        setUploading(true);
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
          const fileExt = (documentName?.split('.').pop() ?? 'jpg').toLowerCase();
          const filePath = `${user.id}/${Date.now()}.${fileExt}`;
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          const { data: { session: uploadSession } } = await supabase.auth.getSession();
          const uploadUrl = `${supabaseUrl}/storage/v1/object/certificates/${filePath}`;
          const uploadResult = await FileSystem.uploadAsync(uploadUrl, documentUri!, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            headers: {
              Authorization: `Bearer ${uploadSession?.access_token ?? supabaseAnonKey}`,
              apikey: supabaseAnonKey,
              'Content-Type': mimeType,
              'x-upsert': 'false',
            },
          });
          if (uploadResult.status >= 200 && uploadResult.status < 300) {
            const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(filePath);
            documentFileUrl = publicUrl;
          } else {
            Alert.alert('Upload failed', `Status ${uploadResult.status}: ${uploadResult.body}`);
            return;
          }
        } finally {
          setUploading(false);
        }
      }

      const { error } = await supabase.from('certificates').insert({
        user_id: user.id,
        category,
        title: title.trim(),
        issuing_body: issuingBody.trim(),
        issued_date: issuedDate!.toISOString().slice(0, 10),
        expires_date: expiresDate ? expiresDate.toISOString().slice(0, 10) : null,
        reference_number: referenceNumber.trim() || null,
        document_file_url: documentFileUrl,
      });
      if (error) { Alert.alert('Error saving certificate', error.message); return; }
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.close} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add certificate</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || uploading} activeOpacity={0.7}>
          {saving || uploading ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
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
                onPress={() => confirmSwitch(c.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.catLabel, category === c.key && styles.catLabelActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Label text="TITLE" />
          <TextInput
            style={[styles.input, !!errors.title && { borderColor: colors.danger }]}
            value={title}
            onChangeText={v => { setTitle(v); clearError('title'); }}
            placeholder={
              category === 'licence' ? 'B Licence, C Licence, D Licence' :
              category === 'rating'  ? 'AFF Instructor, Coach 1, Tandem Instructor' :
              'Class 1 Medical, Fitness Declaration'
            }
            placeholderTextColor={colors.fg3}
            autoCapitalize="words"
          />
          {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

          <Label text="ISSUING BODY" />
          <TextInput
            style={[styles.input, !!errors.issuingBody && { borderColor: colors.danger }]}
            value={issuingBody}
            onChangeText={v => { setIssuingBody(v); clearError('issuingBody'); }}
            placeholder={
              category === 'medical' ? 'CASA, CAA, FAA' : 'APF, USPA, BPA'
            }
            placeholderTextColor={colors.fg3}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {!!errors.issuingBody && <Text style={styles.errorText}>{errors.issuingBody}</Text>}

          <View style={styles.row2}>
            <DateField label="ISSUED" value={issuedDate} onChange={d => { setIssuedDate(d); if (expiresDate && expiresDate <= d) setExpiresDate(null); clearError('issuedDate'); }} error={errors.issuedDate} />
            <DateField label="EXPIRES" value={expiresDate} onChange={d => { setExpiresDate(d); clearError('expiresDate'); }} optional error={errors.expiresDate} minimumDate={issuedDate ? new Date(issuedDate.getTime() + 86400000) : undefined} />
          </View>
          {expiresDate && (() => {
            const rd = new Date(expiresDate.getTime() - certReminderDays * 86400000);
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: -spacing[2], marginBottom: spacing[4] }}>
                <Ionicons name="notifications-outline" size={12} color={colors.fg3} />
                <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg3 }}>
                  Expiry reminder will be sent on {rd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            );
          })()}

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

          <TouchableOpacity style={styles.attachRow} onPress={handleUpload} activeOpacity={0.7}>
            {documentUri ? (
              <Image source={{ uri: documentUri }} style={styles.photoThumb} resizeMode="cover" />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera-outline" size={22} color={colors.fg3} />
              </View>
            )}
            <View style={styles.uploadInfo}>
              <Text style={styles.attachTitle}>{documentUri ? (documentName ?? 'Photo selected') : 'Add a photo'}</Text>
              <Text style={styles.attachSub}>{documentUri ? 'Tap to change' : 'JPG, PNG — max 10 MB'}</Text>
            </View>
            {documentUri && (
              <TouchableOpacity onPress={() => { setDocumentUri(null); setDocumentName(null); }} hitSlop={8}>
                <Ionicons name="close-circle" size={20} color={colors.fg3} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  close: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[2] },
  catGrid: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] },
  catCard: { flex: 1, paddingVertical: spacing[3.5], borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  catCardActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
  catLabel: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
  catLabelActive: { color: c.sky },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg },
  row2: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[1] },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4] },
  dateBtnText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg, flex: 1 },
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dateModalSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', paddingBottom: spacing[8] },
  dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  dateModalToolbarBtn: { minWidth: 60 },
  dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
  dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2 },
  dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky, textAlign: 'right' },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[4] },
  photoThumb: { width: 52, height: 52, borderRadius: radii.sm },
  uploadPlaceholder: { width: 52, height: 52, borderRadius: radii.sm, backgroundColor: c.surface2, justifyContent: 'center', alignItems: 'center' },
  uploadInfo: { flex: 1 },
  attachTitle: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg },
  attachSub: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, marginTop: 2 },
  errorText: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.danger, marginTop: -spacing[3], marginBottom: spacing[3] },
  });
}

