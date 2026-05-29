import { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { Certificate } from '@/lib/types';

const CATEGORIES: { key: 'licence' | 'rating' | 'medical' | 'other'; label: string }[] = [
  { key: 'licence', label: 'Licence' },
  { key: 'rating', label: 'Rating' },
  { key: 'medical', label: 'Medical' },
  { key: 'other', label: 'Other' },
];

function Label({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

function DateField({ label, value, onChange, optional, error, minimumDate, maximumDate }: {
  label: string; value: Date | null; onChange: (d: Date) => void;
  optional?: boolean; error?: string; minimumDate?: Date; maximumDate?: Date;
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
  return (
    <View style={styles.fieldGroup}>
      <Label text={label} />
      <TouchableOpacity style={[styles.dateBtn, !!error && styles.inputError]} onPress={() => { setDraft(value ?? (minimumDate ?? new Date())); setOpen(true); }} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={15} color={value ? colors.fg : colors.fg3} style={{ marginRight: spacing[2] }} />
        <Text style={[styles.dateBtnText, !value && { color: colors.fg3 }]}>{display}</Text>
      </TouchableOpacity>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
      <Modal transparent animationType="slide" visible={open} onRequestClose={cancel}>
        <TouchableOpacity style={styles.dateModalOverlay} activeOpacity={1} onPress={cancel}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.dateModalSheet}>
              <View style={styles.dateModalToolbar}>
                <TouchableOpacity onPress={cancel} style={styles.dateModalToolbarBtn}><Text style={styles.dateModalCancelText}>Cancel</Text></TouchableOpacity>
                <Text style={styles.dateModalTitle}>{label.charAt(0) + label.slice(1).toLowerCase()}</Text>
                <TouchableOpacity onPress={confirm} style={styles.dateModalToolbarBtn}><Text style={styles.dateModalDoneText}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={draft} mode="date" display="spinner"
                onChange={(_, s) => { if (s) setDraft(s); }}
                minimumDate={minimumDate} maximumDate={maximumDate}
                textColor={colors.fg} themeVariant="dark" style={{ height: 216 }} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return new Date(iso);
}

function buildChanges(
  orig: Certificate,
  fields: { key: keyof Certificate; label: string; newVal: string | null }[],
): Array<{ field: string; from: string | null; to: string | null }> {
  return fields
    .filter(f => {
      const oldVal = orig[f.key] != null ? String(orig[f.key]) : null;
      return oldVal !== f.newVal;
    })
    .map(f => ({
      field: f.label,
      from: orig[f.key] != null ? String(orig[f.key]) : null,
      to: f.newVal,
    }));
}

export default function EditCertificateScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [orig, setOrig] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState<'licence' | 'rating' | 'medical' | 'other'>('licence');
  const [title, setTitle] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [issuedDate, setIssuedDate] = useState<Date | null>(null);
  const [expiresDate, setExpiresDate] = useState<Date | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [documentUri, setDocumentUri] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; issuingBody?: string; issuedDate?: string; expiresDate?: string }>({});

  useEffect(() => {
    supabase.from('certificates').select('*').eq('id', id).single().then(({ data }) => {
      const c = data as Certificate;
      setOrig(c);
      setCategory(c.category);
      setTitle(c.title ?? '');
      setIssuingBody(c.issuing_body ?? '');
      setIssuedDate(isoToDate(c.issued_date));
      setExpiresDate(isoToDate(c.expires_date));
      setReferenceNumber(c.reference_number ?? '');
      setDocumentUri(c.document_file_url ?? null);
      setDocumentName(c.document_file_url ? 'Current photo' : null);
      if (c.document_file_url) {
        const path = c.document_file_url.includes('/certificates/')
          ? c.document_file_url.split('/certificates/').pop() ?? null
          : null;
        if (path) {
          supabase.storage.from('certificates').createSignedUrl(decodeURIComponent(path), 3600).then(({ data: signed }) => {
            setPhotoSignedUrl(signed?.signedUrl ?? c.document_file_url ?? null);
          });
        } else {
          setPhotoSignedUrl(c.document_file_url);
        }
      }
      setLoading(false);
    });
  }, [id]);

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
      setPhotoSignedUrl(null);
    } catch {
      Alert.alert('Error', 'Could not open document picker.');
    }
  };

  const handleSave = async () => {
    if (!orig) return;
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!issuingBody.trim()) errs.issuingBody = 'Issuing body is required';
    if (!issuedDate) errs.issuedDate = 'Issue date is required';
    if (expiresDate && issuedDate && expiresDate <= issuedDate) errs.expiresDate = 'Expiry must be after the issue date';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }

      const newIssued = issuedDate ? issuedDate.toISOString().slice(0, 10) : null;
      const newExpires = expiresDate ? expiresDate.toISOString().slice(0, 10) : null;

      // Handle document upload — delete old file first if replacing
      let documentFileUrl: string | null = orig.document_file_url ?? null;
      const isNewFile = !!documentUri && !documentUri.startsWith('http');
      const isRemoved = !documentUri && !!orig.document_file_url;

      if (isNewFile || isRemoved) {
        // Delete old file from storage
        if (orig.document_file_url) {
          const oldPath = orig.document_file_url.includes('/certificates/')
            ? orig.document_file_url.split('/certificates/').pop() ?? null
            : null;
          if (oldPath) {
            await supabase.storage.from('certificates').remove([decodeURIComponent(oldPath)]);
          }
        }
        documentFileUrl = null;
      }

      if (isNewFile && documentUri) {
        setUploading(true);
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
          const fileExt = (documentName?.split('.').pop() ?? 'jpg').toLowerCase();
          const filePath = `${user.id}/${Date.now()}.${fileExt}`;
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          const { data: { session: uploadSession } } = await supabase.auth.getSession();
          const uploadResult = await FileSystem.uploadAsync(
            `${supabaseUrl}/storage/v1/object/certificates/${filePath}`,
            documentUri,
            {
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers: {
                Authorization: `Bearer ${uploadSession?.access_token ?? supabaseAnonKey}`,
                apikey: supabaseAnonKey,
                'Content-Type': mimeType,
              },
            },
          );
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

      const changes = buildChanges(orig, [
        { key: 'category', label: 'Category', newVal: category },
        { key: 'title', label: 'Title', newVal: title.trim() },
        { key: 'issuing_body', label: 'Issuing body', newVal: issuingBody.trim() },
        { key: 'issued_date', label: 'Issue date', newVal: newIssued },
        { key: 'expires_date', label: 'Expiry date', newVal: newExpires },
        { key: 'reference_number', label: 'Reference number', newVal: referenceNumber.trim() || null },
      ]);
      // Track document change without exposing URLs
      const hadDoc = !!orig.document_file_url;
      const hasDoc = !!documentFileUrl;
      if (hadDoc !== hasDoc || (hadDoc && hasDoc && orig.document_file_url !== documentFileUrl)) {
        const docLabel = !hadDoc && hasDoc ? 'Document added'
          : hadDoc && !hasDoc ? 'Document removed'
          : 'Document updated';
        changes.push({ field: 'Document', from: null, to: docLabel });
      }

      const { error } = await supabase.from('certificates').update({
        category,
        title: title.trim(),
        issuing_body: issuingBody.trim(),
        issued_date: newIssued,
        expires_date: newExpires,
        reference_number: referenceNumber.trim() || null,
        document_file_url: documentFileUrl,
      }).eq('id', id);
      if (error) { Alert.alert('Error saving', error.message); return; }

      if (changes.length > 0) {
        await supabase.from('edit_log').insert({
          user_id: user.id,
          item_type: 'certificate',
          item_id: id,
          changes,
        });
      }

      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;
  if (!orig) return <View style={[styles.center, { backgroundColor: colors.bg }]}><Text style={{ color: colors.fg2 }}>Not found.</Text></View>;

  const minExpiry = issuedDate ? new Date(issuedDate.getTime() + 86400000) : undefined;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.close} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit certificate</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving || uploading} activeOpacity={0.7}>
          {saving || uploading ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionTitle}>CATEGORY</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryBtn, category === cat.key && styles.categoryBtnActive]}
                onPress={() => setCategory(cat.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryBtnText, category === cat.key && styles.categoryBtnTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fieldGroup}>
            <Label text="TITLE" />
            <TextInput
              style={[styles.input, !!errors.title && styles.inputError]}
              value={title}
              onChangeText={v => { setTitle(v); setErrors(e => ({ ...e, title: undefined })); }}
              placeholderTextColor={colors.fg3}
              autoCapitalize="words"
            />
            {!!errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Label text="ISSUING BODY" />
            <TextInput
              style={[styles.input, !!errors.issuingBody && styles.inputError]}
              value={issuingBody}
              onChangeText={v => { setIssuingBody(v); setErrors(e => ({ ...e, issuingBody: undefined })); }}
              placeholderTextColor={colors.fg3}
              autoCapitalize="words"
            />
            {!!errors.issuingBody && <Text style={styles.errorText}>{errors.issuingBody}</Text>}
          </View>

          <DateField
            label="ISSUED DATE"
            value={issuedDate}
            onChange={d => {
              setIssuedDate(d);
              setErrors(e => ({ ...e, issuedDate: undefined }));
              if (expiresDate && expiresDate <= d) setExpiresDate(null);
            }}
            error={errors.issuedDate}
            maximumDate={new Date()}
          />

          <DateField
            label="EXPIRY DATE"
            value={expiresDate}
            onChange={d => { setExpiresDate(d); setErrors(e => ({ ...e, expiresDate: undefined })); }}
            optional
            error={errors.expiresDate}
            minimumDate={minExpiry}
          />

          <View style={styles.fieldGroup}>
            <Label text="REFERENCE NUMBER" />
            <TextInput
              style={styles.input}
              value={referenceNumber}
              onChangeText={setReferenceNumber}
              placeholderTextColor={colors.fg3}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Photo upload */}
          <TouchableOpacity style={styles.attachRow} onPress={handleUpload} activeOpacity={0.7}>
            {documentUri ? (
              <Image
                source={{ uri: documentUri.startsWith('http') ? (photoSignedUrl ?? documentUri) : documentUri }}
                style={styles.photoThumb}
                resizeMode="cover"
              />
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
              <TouchableOpacity onPress={() => { setDocumentUri(null); setDocumentName(null); setPhotoSignedUrl(null); }} hitSlop={8}>
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    close: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
    saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.sky },
    body: { padding: spacing[5], paddingBottom: spacing[12] },
    sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[2] },
    categoryRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] },
    categoryBtn: { flex: 1, paddingVertical: spacing[2.5], borderRadius: radii.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    categoryBtnActive: { backgroundColor: c.sky, borderColor: c.sky },
    categoryBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg2 },
    categoryBtnTextActive: { color: c.onSky },
    fieldGroup: { marginBottom: spacing[4] },
    input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 16, color: c.fg },
    inputError: { borderColor: c.danger },
    errorText: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.danger, marginTop: 4 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
    dateBtnText: { fontFamily: 'InterTight-Regular', fontSize: 16, color: c.fg },
    dateModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    dateModalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
    dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    dateModalToolbarBtn: { minWidth: 60 },
    dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
    dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 16, color: c.fg2 },
    dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.sky, textAlign: 'right' },
    attachRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[3], marginBottom: spacing[4] },
    photoThumb: { width: 52, height: 52, borderRadius: radii.sm },
    uploadPlaceholder: { width: 52, height: 52, borderRadius: radii.sm, backgroundColor: c.surface2, justifyContent: 'center', alignItems: 'center' },
    uploadInfo: { flex: 1 },
    attachTitle: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg },
    attachSub: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, marginTop: 2 },
  });
}
