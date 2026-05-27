import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';

const GEAR_TYPES: { key: 'rig' | 'canopy' | 'aad'; label: string; icon: string }[] = [
  { key: 'rig',    label: 'Rig',    icon: 'briefcase-outline' },
  { key: 'canopy', label: 'Canopy', icon: 'umbrella-outline' },
  { key: 'aad',    label: 'AAD',    icon: 'hardware-chip-outline' },
];

function Label({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

function DateField({ label, value, onChange, error }: { label: string; value: Date | null; onChange: (d: Date) => void; error?: string }) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const display = value
    ? value.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Tap to select';

  const confirm = () => { onChange(draft); setOpen(false); };
  const cancel = () => { setDraft(value ?? new Date()); setOpen(false); };

  return (
    <View style={styles.fieldGroup}>
      <Label text={label} />
      <TouchableOpacity style={[styles.dateBtn, !!error && styles.inputError]} onPress={() => { setDraft(value ?? new Date()); setOpen(true); }} activeOpacity={0.7}>
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
                maximumDate={new Date()}
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

export default function NewGearScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [gearType, setGearType] = useState<'rig' | 'canopy' | 'aad'>('rig');
  const [canopySubType, setCanopySubType] = useState<'main' | 'reserve'>('main');
  const [makeModel, setMakeModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturedDate, setManufacturedDate] = useState<Date | null>(null);
  const [repackDate, setRepackDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    makeModel?: string;
    serialNumber?: string;
    manufacturedDate?: string;
    repackDate?: string;
  }>({});

  const handleSave = async () => {
    const errs: { makeModel?: string; serialNumber?: string; manufacturedDate?: string; repackDate?: string } = {};
    if (!makeModel.trim()) errs.makeModel = 'Make and model is required';
    if (!serialNumber.trim()) errs.serialNumber = 'Serial number is required';
    if (!manufacturedDate) errs.manufacturedDate = 'Date of manufacture is required';
    if (gearType === 'canopy' && canopySubType === 'reserve' && !repackDate) {
      errs.repackDate = 'Repack date is required';
    } else if (gearType === 'canopy' && canopySubType === 'reserve' && repackDate && manufacturedDate && repackDate < manufacturedDate) {
      errs.repackDate = 'Repack date cannot be before manufacture date';
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }
      const { error } = await supabase.from('gear').insert({
        user_id: user.id,
        type: gearType,
        canopy_sub_type: gearType === 'canopy' ? canopySubType : null,
        make_model: makeModel.trim(),
        serial_number: serialNumber.trim(),
        manufactured_date: manufacturedDate ? manufacturedDate.toISOString().slice(0, 10) : null,
        last_repack_date: (gearType === 'canopy' && canopySubType === 'reserve' && repackDate)
          ? repackDate.toISOString().slice(0, 10)
          : null,
        repack_reminder_enabled: gearType === 'canopy' && canopySubType === 'reserve',
      });
      if (error) { Alert.alert('Error saving gear', error.message); return; }
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
                onPress={() => { setGearType(g.key); setErrors({}); }}
                activeOpacity={0.7}
              >
                <Ionicons name={g.icon as any} size={26} color={gearType === g.key ? colors.sky : colors.fg2} />
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
                    onPress={() => { setCanopySubType(t); setErrors(e => ({ ...e, repackDate: undefined })); }}
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
            <Label text="MAKE / MODEL" />
            <TextInput
              style={[styles.input, !!errors.makeModel && styles.inputError]}
              value={makeModel}
              onChangeText={v => { setMakeModel(v); if (errors.makeModel) setErrors(e => ({ ...e, makeModel: undefined })); }}
              placeholder={
                gearType === 'rig' ? 'Vector 3, Javelin Odyssey, Icon i5' :
                gearType === 'aad' ? 'Cypress 2, Vigil II, MARS' :
                canopySubType === 'reserve' ? 'PD Reserve, Optimum, Smart 150' :
                'Crossfire 3, Sabre 3, Pilot 7'
              }
              placeholderTextColor={colors.fg3}
              autoCapitalize="words"
              autoCorrect={false}
            />
            {!!errors.makeModel && <Text style={styles.errorText}>{errors.makeModel}</Text>}
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
            onChange={d => { setManufacturedDate(d); setErrors(e => ({ ...e, manufacturedDate: undefined })); }}
            error={errors.manufacturedDate}
          />

          {/* Repack date — reserve canopies only */}
          {gearType === 'canopy' && canopySubType === 'reserve' && (
            <DateField
              label="REPACK ON"
              value={repackDate}
              onChange={d => { setRepackDate(d); setErrors(e => ({ ...e, repackDate: undefined })); }}
              error={errors.repackDate}
            />
          )}
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
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3] },
  dateBtnText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg, flex: 1 },
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dateModalSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', paddingBottom: spacing[8] },
  dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  dateModalToolbarBtn: { minWidth: 60 },
  dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
  dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2 },
  dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky, textAlign: 'right' },
  });
}
