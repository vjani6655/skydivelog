import { useState, useMemo, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Path, Line, Rect } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

// Open-canopy icon built from SVG primitives (matches app brand icon)
function CanopyIcon({ size, color }: { size: number; color: string }) {
  const s = size / 64;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M6 28 C 8 18, 14 14, 22 14 L 42 14 C 50 14, 56 18, 58 28 L 50 26 L 42 28 L 32 26 L 22 28 L 14 26 Z"
        fill={color} stroke={color} strokeWidth={2 * (1 / s)} strokeLinejoin="round"
      />
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

const GEAR_TYPES: { key: 'rig' | 'canopy' | 'aad'; label: string; icon?: string }[] = [
  { key: 'rig',    label: 'Rig',    icon: 'bag-handle-outline' },
  { key: 'canopy', label: 'Canopy' },
  { key: 'aad',    label: 'AAD',    icon: 'hardware-chip-outline' },
];

function Label({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

function DateField({ label, value, onChange, error, minimumDate, maximumDate }: { label: string; value: Date | null; onChange: (d: Date) => void; error?: string; minimumDate?: Date; maximumDate?: Date }) {
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
          <DateTimePicker
            value={draft}
            mode="date"
            display="default"
            onChange={(_, selected) => { setOpen(false); if (selected) { setDraft(selected); onChange(selected); } }}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
          />
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
                <TouchableOpacity onPress={cancel} style={styles.dateModalToolbarBtn}>
                  <Text style={styles.dateModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.dateModalTitle}>Date</Text>
                <TouchableOpacity onPress={confirm} style={styles.dateModalToolbarBtn}>
                  <Text style={styles.dateModalDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                onChange={(_, selected) => { if (selected) setDraft(selected); }}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
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

function hasFormData(makeModel: string, serialNumber: string, manufacturedDate: Date | null): boolean {
  return makeModel.trim().length > 0 || serialNumber.trim().length > 0 || manufacturedDate !== null;
}

export default function NewGearScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [gearType, setGearType] = useState<'rig' | 'canopy' | 'aad'>('rig');
  const [canopySubType, setCanopySubType] = useState<'main' | 'reserve'>('main');
  const [linkedMainGearId, setLinkedMainGearId] = useState<string | null>(null);
  const [mainCanopies, setMainCanopies] = useState<Array<{ id: string; make_model: string }>>([]);
  const [reminderDays, setReminderDays] = useState(30);
  const [makeModel, setMakeModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturedDate, setManufacturedDate] = useState<Date | null>(null);
  const [lastRepackDate, setLastRepackDate] = useState<Date | null>(null);
  const [nextRepackDate, setNextRepackDate] = useState<Date | null>(null);
  const [nextServiceDate, setNextServiceDate] = useState<Date | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    makeModel?: string;
    serialNumber?: string;
    manufacturedDate?: string;
    lastRepackDate?: string;
    nextRepackDate?: string;
    nextServiceDate?: string;
  }>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return;
      Promise.all([
        supabase.from('gear').select('id, make_model').eq('user_id', session.user.id).eq('type', 'canopy').eq('canopy_sub_type', 'main').order('make_model'),
        supabase.from('users').select('repack_reminder_days').eq('id', session.user.id).single(),
      ]).then(([{ data: mains }, { data: prefs }]) => {
        setMainCanopies(mains ?? []);
        if (prefs?.repack_reminder_days != null) setReminderDays(prefs.repack_reminder_days);
      });
    });
  }, []);

  const clearForm = () => {
    setMakeModel('');
    setSerialNumber('');
    setManufacturedDate(null);
    setLastRepackDate(null);
    setNextRepackDate(null);
    setNextServiceDate(null);
    setPhotoUri(null);
    setPhotoName(null);
    setLinkedMainGearId(null);
    setErrors({});
  };

  const confirmSwitch = (onConfirm: () => void) => {
    if (hasFormData(makeModel, serialNumber, manufacturedDate)) {
      Alert.alert(
        'Unsaved changes',
        'Your data will be lost if you switch. Save first or discard.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard & switch', style: 'destructive', onPress: () => { clearForm(); onConfirm(); } },
        ],
      );
    } else {
      clearForm();
      onConfirm();
    }
  };

  const handlePickPhoto = async () => {
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
      setPhotoUri(asset.uri);
      setPhotoName(asset.name ?? 'photo');
    } catch {
      Alert.alert('Error', 'Could not open image picker.');
    }
  };

  const handleSave = async () => {
    const errs: { makeModel?: string; serialNumber?: string; manufacturedDate?: string; lastRepackDate?: string; nextRepackDate?: string; nextServiceDate?: string } = {};
    if (!makeModel.trim()) errs.makeModel = 'Make and model is required';
    if (!serialNumber.trim()) errs.serialNumber = 'Serial number is required';
    if (!manufacturedDate) errs.manufacturedDate = 'Date of manufacture is required';
    if (gearType === 'canopy' && canopySubType === 'reserve') {
      if (!lastRepackDate) errs.lastRepackDate = 'Last repacked date is required';
      if (!nextRepackDate) errs.nextRepackDate = 'Next repack date is required';
    }
    if (gearType === 'aad' && !nextServiceDate) errs.nextServiceDate = 'Next service date is required';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }

      let photoUrl: string | null = null;
      if (photoUri) {
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

      const { error } = await supabase.from('gear').insert({
        user_id: user.id,
        type: gearType,
        canopy_sub_type: gearType === 'canopy' ? canopySubType : null,
        make_model: makeModel.trim(),
        serial_number: serialNumber.trim(),
        manufactured_date: manufacturedDate ? manufacturedDate.toISOString().slice(0, 10) : null,
        last_repack_date: (gearType === 'canopy' && canopySubType === 'reserve' && lastRepackDate)
          ? lastRepackDate.toISOString().slice(0, 10)
          : null,
        next_repack_date: (gearType === 'canopy' && canopySubType === 'reserve' && nextRepackDate)
          ? nextRepackDate.toISOString().slice(0, 10)
          : null,
        repack_reminder_enabled: gearType === 'canopy' && canopySubType === 'reserve',
        next_service_date: gearType === 'aad' && nextServiceDate ? nextServiceDate.toISOString().slice(0, 10) : null,
        linked_main_gear_id: (gearType === 'canopy' && canopySubType === 'reserve') ? linkedMainGearId : null,
        photo_url: photoUrl,
      });
      if (error) { Alert.alert('Error saving gear', error.message); return; }
      router.back();
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
        <Text style={styles.headerTitle}>Add gear</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>TYPE</Text>
          <View style={styles.typeRow}>
            {GEAR_TYPES.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.typeCard, gearType === g.key && styles.typeCardActive]}
                onPress={() => { if (gearType !== g.key) confirmSwitch(() => setGearType(g.key)); }}
                activeOpacity={0.7}
              >
                {g.key === 'canopy' ? (
                  <CanopyIcon size={26} color={gearType === g.key ? colors.sky : colors.fg2} />
                ) : (
                  <Ionicons name={g.icon as any} size={26} color={gearType === g.key ? colors.sky : colors.fg2} />
                )}
                <Text style={[styles.typeLabel, gearType === g.key && styles.typeLabelActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Canopy sub-type: Main vs Reserve */}
          {gearType === 'canopy' && (
            <>
              <Text style={styles.sectionTitle}>CANOPY TYPE</Text>
              <View style={[styles.typeRow, { marginBottom: spacing[5] }]}>
                {(['main', 'reserve'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.subTypeCard, canopySubType === t && styles.subTypeCardActive]}
                    onPress={() => { if (canopySubType !== t) confirmSwitch(() => setCanopySubType(t)); }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={t === 'main' ? 'umbrella-outline' : 'shield-checkmark-outline'}
                      size={20}
                      color={canopySubType === t ? colors.sky : colors.fg2}
                    />
                    <Text style={[styles.subTypeLabel, canopySubType === t && styles.subTypeLabelActive]}>
                      {t === 'main' ? 'Main' : 'Reserve'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.fieldGroup}>
            <Label text={gearType === 'canopy' ? 'MAKE / MODEL / SIZE' : 'MAKE / MODEL'} />
            <TextInput
              style={[styles.input, !!errors.makeModel && styles.inputError]}
              value={makeModel}
              onChangeText={v => { setMakeModel(v); if (errors.makeModel) setErrors(e => ({ ...e, makeModel: undefined })); }}
              placeholder={
                gearType === 'rig' ? 'Vector 3, Javelin Odyssey, Icon i5' :
                gearType === 'aad' ? 'Cypress 2, Vigil II, MARS' :
                canopySubType === 'reserve' ? 'Optimum 270, PD Reserve 176, Smart 150' :
                'Sabre 1 135, Crossfire 3 109, Pilot 7 188'
              }
              placeholderTextColor={colors.fg3}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {!!errors.makeModel && <Text style={styles.errorText}>{errors.makeModel}</Text>}
            {gearType === 'canopy' && (
              <Text style={styles.fieldHint}>
                {canopySubType === 'reserve'
                  ? 'Include the make, model, and size — e.g. "Optimum 270". This name cannot be changed after saving.'
                  : 'Include the make, model, and size — e.g. "Sabre 1 135". This name cannot be changed after saving.'}
              </Text>
            )}
          </View>

          <View style={styles.fieldGroup}>
            <Label text="SERIAL NUMBER" />
            <TextInput
              style={[styles.input, !!errors.serialNumber && styles.inputError]}
              value={serialNumber}
              onChangeText={v => { setSerialNumber(v); if (errors.serialNumber) setErrors(e => ({ ...e, serialNumber: undefined })); }}
              placeholder={
                gearType === 'rig' ? 'VK-2402-0001' :
                gearType === 'aad' ? 'CY-2024-000001' :
                canopySubType === 'reserve' ? 'PDR-24-0001' :
                'PD-242-00001'
              }
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

          {/* Last repacked + next repack — reserve canopies only */}
          {gearType === 'canopy' && canopySubType === 'reserve' && (
            <>
              <DateField
                label="LAST REPACKED ON"
                value={lastRepackDate}
                onChange={d => {
                  setLastRepackDate(d);
                  setErrors(e => ({ ...e, lastRepackDate: undefined }));
                  // clear next if it's now out of range
                  if (nextRepackDate) {
                    const maxNext = new Date(d);
                    maxNext.setMonth(maxNext.getMonth() + 13);
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
                maximumDate={(() => {
                  const base = lastRepackDate ?? new Date();
                  const d = new Date(base);
                  d.setMonth(d.getMonth() + 13);
                  return d;
                })()}
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
          {gearType === 'canopy' && canopySubType === 'reserve' && mainCanopies.length > 0 && (
            <View style={styles.fieldGroup}>
              <Label text="LINKED MAIN CANOPY (OPTIONAL)" />
              <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 12, color: colors.fg3, marginBottom: spacing[2] }}>
                Select the main canopy this reserve is currently packed under. Jumps on that main will count towards this reserve&apos;s jump total.
              </Text>
              <View style={styles.typeRow}>
                {mainCanopies.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.subTypeCard, linkedMainGearId === c.id && styles.subTypeCardActive]}
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
          {gearType === 'aad' && (
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
                <Image source={{ uri: photoUri }} style={styles.photoThumb} resizeMode="cover" />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="camera-outline" size={22} color={colors.fg3} />
                </View>
              )}
              <View style={styles.uploadInfo}>
                <Text style={styles.uploadLabel}>{photoUri ? photoName ?? 'Photo selected' : 'Add a photo'}</Text>
                <Text style={styles.uploadSub}>{photoUri ? 'Tap to change' : 'JPG, PNG — max 10 MB'}</Text>
              </View>
              {photoUri && (
                <TouchableOpacity onPress={() => { setPhotoUri(null); setPhotoName(null); }} hitSlop={8}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  close: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[2] },

  // Horizontal type selector
  typeRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[5] },
  typeCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingVertical: spacing[4], paddingHorizontal: spacing[2] },
  typeCardActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
  typeLabel: { fontFamily: 'InterTight-Medium', fontSize: 12, color: c.fg2, textAlign: 'center' },
  typeLabelActive: { color: c.sky },

  // Canopy sub-type (Main / Reserve)
  subTypeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing[2], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingVertical: spacing[3] },
  subTypeCardActive: { borderColor: c.sky, backgroundColor: 'rgba(74,158,255,0.08)' },
  subTypeLabel: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg2 },
  subTypeLabelActive: { color: c.sky },
  fieldGroup: { marginBottom: spacing[4] },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg },
  inputError: { borderColor: c.danger },
  errorText: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.danger, marginTop: spacing[1] },
  fieldHint: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, marginTop: spacing[1.5], lineHeight: 17 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  dateBtnText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg, flex: 1 },
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dateModalSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', paddingBottom: spacing[8] },
  dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  dateModalToolbarBtn: { minWidth: 60 },
  dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
  dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2 },
  dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky, textAlign: 'right' },
  uploadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[3] },
  photoThumb: { width: 52, height: 52, borderRadius: radii.sm },
  uploadPlaceholder: { width: 52, height: 52, borderRadius: radii.sm, backgroundColor: c.surface2, justifyContent: 'center', alignItems: 'center' },
  uploadInfo: { flex: 1 },
  uploadLabel: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.fg },
  uploadSub: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg3, marginTop: 2 },
  });
}
