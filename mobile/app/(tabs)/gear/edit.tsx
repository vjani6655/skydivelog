import { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Line, Rect } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import type { Gear } from '@/lib/types';

function CanopyIcon({ size, color }: { size: number; color: string }) {
  const s = size / 64;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path d="M6 28 C 8 18, 14 14, 22 14 L 42 14 C 50 14, 56 18, 58 28 L 50 26 L 42 28 L 32 26 L 22 28 L 14 26 Z"
        fill={color} stroke={color} strokeWidth={2 * (1 / s)} strokeLinejoin="round" />
      <Line x1="14" y1="26" x2="16" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5 * (1 / s)} />
      <Line x1="22" y1="28" x2="24" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5 * (1 / s)} />
      <Line x1="32" y1="26" x2="32" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5 * (1 / s)} />
      <Line x1="42" y1="28" x2="40" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5 * (1 / s)} />
      <Line x1="50" y1="26" x2="48" y2="14" stroke={color} strokeOpacity={0.45} strokeWidth={1.5 * (1 / s)} />
      <Path d="M10 28 L 32 50 L 54 28" stroke={color} strokeWidth={3 * (1 / s)} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="29" y="48" width="6" height="10" rx="3" fill={color} />
    </Svg>
  );
}

function Label({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

function DateField({ label, value, onChange, error, minimumDate, maximumDate }: {
  label: string; value: Date | null; onChange: (d: Date) => void; error?: string; minimumDate?: Date; maximumDate?: Date;
}) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const display = value
    ? value.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Tap to select';
  const confirm = () => { onChange(draft); setOpen(false); };
  const cancel = () => { setDraft(value ?? new Date()); setOpen(false); };

  if (Platform.OS === 'android') {
    return (
      <View style={styles.fieldGroup}>
        <Label text={label} />
        <TouchableOpacity style={[styles.dateBtn, !!error && styles.inputError]} onPress={() => { setDraft(value ?? (minimumDate ?? new Date())); setOpen(true); }} activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={15} color={value ? colors.fg : colors.fg3} style={{ marginRight: spacing[2] }} />
          <Text style={[styles.dateBtnText, !value && { color: colors.fg3 }]}>{display}</Text>
        </TouchableOpacity>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {open && (
          <DateTimePicker value={draft} mode="date" display="default"
            onChange={(_, s) => { setOpen(false); if (s) { setDraft(s); onChange(s); } }}
            maximumDate={maximumDate} minimumDate={minimumDate} />
        )}
      </View>
    );
  }

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
                <Text style={styles.dateModalTitle}>Date</Text>
                <TouchableOpacity onPress={confirm} style={styles.dateModalToolbarBtn}><Text style={styles.dateModalDoneText}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={draft} mode="date" display="spinner"
                onChange={(_, s) => { if (s) setDraft(s); }}
                maximumDate={maximumDate} minimumDate={minimumDate}
                textColor={colors.fg} themeVariant="dark" style={{ height: 216 }} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function fmtDateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function isoToDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return new Date(iso);
}

function buildChanges(
  orig: Gear,
  fields: { key: keyof Gear; label: string; newVal: string | null }[],
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

export default function EditGearScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [orig, setOrig] = useState<Gear | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [makeModel, setMakeModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturedDate, setManufacturedDate] = useState<Date | null>(null);
  const [lastRepackDate, setLastRepackDate] = useState<Date | null>(null);
  const [nextRepackDate, setNextRepackDate] = useState<Date | null>(null);
  const [nextServiceDate, setNextServiceDate] = useState<Date | null>(null);
  const [linkedMainGearId, setLinkedMainGearId] = useState<string | null>(null);
  const [mainCanopies, setMainCanopies] = useState<Array<{ id: string; make_model: string }>>([]);
  const [reminderDays, setReminderDays] = useState(30);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    makeModel?: string; serialNumber?: string; manufacturedDate?: string;
    lastRepackDate?: string; nextRepackDate?: string; nextServiceDate?: string;
  }>({});

  useEffect(() => {
    supabase.from('gear').select('*').eq('id', id).single().then(({ data }) => {
      const g = data as Gear;
      setOrig(g);
      setMakeModel(g.make_model ?? '');
      setSerialNumber(g.serial_number ?? '');
      setManufacturedDate(isoToDate(g.manufactured_date));
      setLastRepackDate(isoToDate(g.last_repack_date));
      setNextRepackDate(isoToDate(g.next_repack_date));
      setNextServiceDate(isoToDate(g.next_service_date));
      setLinkedMainGearId(g.linked_main_gear_id ?? null);
      // Load user prefs + main canopies in parallel
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return;
        const queries: Promise<any>[] = [
          supabase.from('users').select('repack_reminder_days').eq('id', session.user.id).single(),
        ];
        if (g.type === 'canopy' && g.canopy_sub_type === 'reserve') {
          queries.push(
            supabase.from('gear').select('id, make_model').eq('user_id', session.user.id).eq('type', 'canopy').eq('canopy_sub_type', 'main').order('make_model'),
          );
        }
        Promise.all(queries).then(([{ data: prefs }, mainsResult]) => {
          if (prefs?.repack_reminder_days != null) setReminderDays(prefs.repack_reminder_days);
          if (mainsResult?.data) setMainCanopies(mainsResult.data);
        });
      });
      // photo: show existing URL as initial preview if it's a local-compatible uri, else keep as-is
      setPhotoUri(g.photo_url ?? null);
      setPhotoName(g.photo_url ? 'Current photo' : null);
      // Generate signed URL for existing photo preview
      if (g.photo_url) {
        const path = g.photo_url.includes('/gear-photos/') ? g.photo_url.split('/gear-photos/')[1] : null;
        if (path) {
          supabase.storage.from('gear-photos').createSignedUrl(path, 3600).then(({ data: signed }) => {
            setPhotoSignedUrl(signed?.signedUrl ?? g.photo_url ?? null);
          });
        } else {
          setPhotoSignedUrl(g.photo_url);
        }
      }
      setLoading(false);
    });
  }, [id]);

  const isReserve = orig?.type === 'canopy' && orig?.canopy_sub_type === 'reserve';
  const isMain = orig?.type === 'canopy' && orig?.canopy_sub_type === 'main';
  const isCanopy = isReserve || isMain;
  const isAad = orig?.type === 'aad';

  const handlePickPhoto = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (asset.size !== undefined && asset.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose an image under 10 MB.');
        return;
      }
      setPhotoUri(asset.uri);
      setPhotoName(asset.name ?? 'photo');
      setPhotoSignedUrl(null); // new local file, no need for signed URL
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleSave = async () => {
    if (!orig) return;
    const errs: typeof errors = {};
    if (!makeModel.trim()) errs.makeModel = 'Make and model is required';
    if (!serialNumber.trim()) errs.serialNumber = 'Serial number is required';
    if (isReserve) {
      if (!lastRepackDate) errs.lastRepackDate = 'Last repacked date is required';
      if (!nextRepackDate) errs.nextRepackDate = 'Next repack date is required';
    }
    if (isAad && !nextServiceDate) errs.nextServiceDate = 'Next service date is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }

      const newManufactured = manufacturedDate ? manufacturedDate.toISOString().slice(0, 10) : null;
      const newLastRepack = lastRepackDate ? lastRepackDate.toISOString().slice(0, 10) : null;
      const newNextRepack = nextRepackDate ? nextRepackDate.toISOString().slice(0, 10) : null;
      const newNextService = nextServiceDate ? nextServiceDate.toISOString().slice(0, 10) : null;

      let photoUrl: string | null = orig.photo_url ?? null;
      const isNewPhoto = !!photoUri && !photoUri.startsWith('http');
      const isPhotoRemoved = !photoUri && !!orig.photo_url;

      // Delete old photo from storage before replacing or removing
      if ((isNewPhoto || isPhotoRemoved) && orig.photo_url) {
        const oldPath = orig.photo_url.includes('/gear-photos/')
          ? orig.photo_url.split('/gear-photos/').pop() ?? null
          : null;
        if (oldPath) {
          await supabase.storage.from('gear-photos').remove([decodeURIComponent(oldPath)]);
        }
        photoUrl = null;
      }

      // Only upload if the user picked a new local file (not an https URL)
      if (isNewPhoto && photoUri) {
        setUploading(true);
        try {
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
          const fileExt = (photoName?.split('.').pop() ?? 'jpg').toLowerCase();
          const filePath = `${user.id}/${Date.now()}.${fileExt}`;
          const mimeType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
          const { data: { session: up } } = await supabase.auth.getSession();
          const uploadResult = await FileSystem.uploadAsync(
            `${supabaseUrl}/storage/v1/object/gear-photos/${filePath}`,
            photoUri,
            {
              httpMethod: 'POST',
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
              headers: {
                Authorization: `Bearer ${up?.access_token ?? supabaseAnonKey}`,
                apikey: supabaseAnonKey,
                'Content-Type': mimeType,
              },
            },
          );
          if (uploadResult.status >= 200 && uploadResult.status < 300) {
            const { data: { publicUrl } } = supabase.storage.from('gear-photos').getPublicUrl(filePath);
            photoUrl = publicUrl;
          } else {
            Alert.alert('Photo upload failed', `${uploadResult.status}: ${uploadResult.body}`);
            return;
          }
        } finally {
          setUploading(false);
        }
      }

      const changes = buildChanges(orig, [
        { key: 'make_model', label: 'Make / Model', newVal: makeModel.trim() },
        { key: 'serial_number', label: 'Serial number', newVal: serialNumber.trim() },
        { key: 'manufactured_date', label: 'Date of manufacture', newVal: newManufactured },
        { key: 'last_repack_date', label: 'Last repacked on', newVal: newLastRepack },
        { key: 'next_repack_date', label: 'Next repack date', newVal: newNextRepack },
        { key: 'next_service_date', label: 'Next service date', newVal: newNextService },
        { key: 'linked_main_gear_id', label: 'Linked main canopy', newVal: isReserve ? (linkedMainGearId ?? null) : null },
      ]);
      // Handle photo change separately — never expose raw URLs in the log
      const hadPhoto = !!orig.photo_url;
      const hasPhoto = !!photoUrl;
      if (hadPhoto !== hasPhoto || (hadPhoto && hasPhoto && orig.photo_url !== photoUrl)) {
        const photoLabel = !hadPhoto && hasPhoto ? 'Photo added'
          : hadPhoto && !hasPhoto ? 'Photo removed'
          : 'Photo updated';
        changes.push({ field: 'Photo', from: null, to: photoLabel });
      }

      const { error } = await supabase.from('gear').update({
        make_model: makeModel.trim(),
        serial_number: serialNumber.trim(),
        manufactured_date: newManufactured,
        last_repack_date: newLastRepack,
        next_repack_date: newNextRepack,
        next_service_date: newNextService,
        linked_main_gear_id: isReserve ? (linkedMainGearId ?? null) : null,
        photo_url: photoUrl,
      }).eq('id', id);
      if (error) { Alert.alert('Error saving', error.message); return; }

      if (changes.length > 0) {
        await supabase.from('edit_log').insert({
          user_id: user.id,
          item_type: 'gear',
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

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.close} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit gear</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Type display — read-only */}
          <View style={styles.typeBadgeRow}>
            <View style={styles.typeBadge}>
              {orig.type === 'canopy' ? (
                <CanopyIcon size={16} color={colors.sky} />
              ) : orig.type === 'rig' ? (
                <Ionicons name="bag-handle-outline" size={16} color={colors.sky} />
              ) : (
                <Ionicons name="hardware-chip-outline" size={16} color={colors.sky} />
              )}
              <Text style={styles.typeBadgeText}>
                {orig.type.toUpperCase()}{orig.canopy_sub_type ? ` · ${orig.canopy_sub_type.toUpperCase()}` : ''}
              </Text>
            </View>
            <Text style={styles.typeBadgeHint}>Type cannot be changed</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Label text={isCanopy ? 'MAKE / MODEL / SIZE' : 'MAKE / MODEL'} />
            <TextInput
              style={[styles.input, isCanopy && styles.inputDisabled, !!errors.makeModel && styles.inputError]}
              value={makeModel}
              onChangeText={isCanopy ? undefined : v => { setMakeModel(v); setErrors(e => ({ ...e, makeModel: undefined })); }}
              editable={!isCanopy}
              placeholderTextColor={colors.fg3}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {isCanopy && (
              <Text style={styles.fieldHint}>
                {isReserve ? 'Reserve' : 'Main'} canopy name cannot be changed after saving.
              </Text>
            )}
            {!!errors.makeModel && <Text style={styles.errorText}>{errors.makeModel}</Text>}
          </View>

          <View style={styles.fieldGroup}>
            <Label text="SERIAL NUMBER" />
            <TextInput
              style={[styles.input, !!errors.serialNumber && styles.inputError]}
              value={serialNumber}
              onChangeText={v => { setSerialNumber(v); setErrors(e => ({ ...e, serialNumber: undefined })); }}
              placeholderTextColor={colors.fg3}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!errors.serialNumber && <Text style={styles.errorText}>{errors.serialNumber}</Text>}
          </View>

          <DateField
            label="DATE OF MANUFACTURE"
            value={manufacturedDate}
            onChange={d => {
              setManufacturedDate(d);
              setErrors(e => ({ ...e, manufacturedDate: undefined }));
              if (lastRepackDate && lastRepackDate < d) { setLastRepackDate(null); setNextRepackDate(null); }
            }}
            error={errors.manufacturedDate}
            maximumDate={new Date()}
          />

          {isReserve && (
            <>
              <DateField
                label="LAST REPACKED ON"
                value={lastRepackDate}
                onChange={d => {
                  setLastRepackDate(d);
                  setErrors(e => ({ ...e, lastRepackDate: undefined }));
                  if (nextRepackDate) {
                    const maxNext = new Date(d); maxNext.setMonth(maxNext.getMonth() + 13);
                    if (nextRepackDate < d || nextRepackDate > maxNext) setNextRepackDate(null);
                  }
                }}
                error={errors.lastRepackDate}
                minimumDate={manufacturedDate ?? undefined}
                maximumDate={new Date()}
              />
              <DateField
                label="NEXT REPACK DATE"
                value={nextRepackDate}
                onChange={d => { setNextRepackDate(d); setErrors(e => ({ ...e, nextRepackDate: undefined })); }}
                error={errors.nextRepackDate}
                minimumDate={lastRepackDate ?? new Date()}
                maximumDate={(() => { const base = lastRepackDate ?? new Date(); const d = new Date(base); d.setMonth(d.getMonth() + 13); return d; })()}
              />
              {nextRepackDate && (() => {
                const rd = new Date(nextRepackDate.getTime() - reminderDays * 86400000);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: -spacing[2], marginBottom: spacing[4] }}>
                    <Ionicons name="notifications-outline" size={12} color={colors.fg3} />
                    <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg3 }}>
                      Reminder will be sent on {rd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                );
              })()}
            </>
          )}

          {/* Link reserve to a main canopy */}
          {isReserve && mainCanopies.length > 0 && (
            <View style={styles.fieldGroup}>
              <Label text="LINKED MAIN CANOPY (OPTIONAL)" />
              <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg3, marginBottom: spacing[2] }}>
                Jumps on the linked main will count towards this reserve&apos;s jump total.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                {mainCanopies.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.subTypeCard, { paddingHorizontal: spacing[3] }, linkedMainGearId === c.id && styles.subTypeCardActive]}
                    onPress={() => setLinkedMainGearId(linkedMainGearId === c.id ? null : c.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.subTypeLabel, linkedMainGearId === c.id && styles.subTypeLabelActive]} numberOfLines={1}>{c.make_model}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Next service date — AAD only */}
          {isAad && (
            <>
              <DateField
                label="NEXT SERVICE DATE"
                value={nextServiceDate}
                onChange={d => { setNextServiceDate(d); setErrors(e => ({ ...e, nextServiceDate: undefined })); }}
                error={errors.nextServiceDate}
              />
              {nextServiceDate && (() => {
                const rd = new Date(nextServiceDate.getTime() - reminderDays * 86400000);
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1.5], marginTop: -spacing[2], marginBottom: spacing[4] }}>
                    <Ionicons name="notifications-outline" size={12} color={colors.fg3} />
                    <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg3 }}>
                      Reminder will be sent on {rd.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                );
              })()}
            </>
          )}

          {/* Photo */}
          <View style={styles.fieldGroup}>
            <Label text="PHOTO (OPTIONAL)" />
            <TouchableOpacity style={styles.uploadRow} onPress={handlePickPhoto} activeOpacity={0.7}>
              {photoUri ? (
                <Image source={{ uri: photoUri.startsWith('http') ? (photoSignedUrl ?? photoUri) : photoUri }} style={styles.photoThumb} resizeMode="cover" />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={22} color={colors.fg3} />
                </View>
              )}
              <View style={styles.uploadInfo}>
                <Text style={styles.uploadLabel}>{photoUri ? (photoName ?? 'Photo selected') : 'Add a photo'}</Text>
                <Text style={styles.uploadSub}>{photoUri ? 'Tap to change' : 'JPG, PNG — max 10 MB'}</Text>
              </View>
              {photoUri && (
                <TouchableOpacity onPress={() => { setPhotoUri(null); setPhotoName(null); setPhotoSignedUrl(null); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.fg3} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
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
    typeBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[5] },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], backgroundColor: c.surface2, paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.pill },
    typeBadgeText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: c.sky, letterSpacing: 0.5 },
    typeBadgeHint: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3 },
    fieldGroup: { marginBottom: spacing[4] },
    input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 16, color: c.fg },
    inputDisabled: { backgroundColor: c.surface2, color: c.fg3 },
    inputError: { borderColor: c.danger },
    errorText: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.danger, marginTop: 4 },
    fieldHint: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, marginTop: spacing[1.5], lineHeight: 17 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
    dateBtnText: { fontFamily: 'InterTight-Regular', fontSize: 16, color: c.fg },
    dateModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    dateModalSheet: { backgroundColor: c.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 32 },
    dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
    dateModalToolbarBtn: { minWidth: 60 },
    dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
    dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 16, color: c.fg2 },
    dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 16, color: c.sky, textAlign: 'right' },
    subTypeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingVertical: spacing[2.5], paddingHorizontal: spacing[3] },
    subTypeCardActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
    subTypeLabel: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg2 },
    subTypeLabelActive: { color: c.sky },
    uploadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[3] },
    photoThumb: { width: 52, height: 52, borderRadius: radii.sm },
    uploadPlaceholder: { width: 52, height: 52, borderRadius: radii.sm, backgroundColor: c.surface2, justifyContent: 'center', alignItems: 'center' },
    uploadInfo: { flex: 1 },
    uploadLabel: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg },
    uploadSub: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, marginTop: 2 },
  });
}
