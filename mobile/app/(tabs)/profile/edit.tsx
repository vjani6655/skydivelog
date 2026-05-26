import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radii } from '@/constants/tokens';

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function IconInput({ icon, ...props }: { icon: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.iconInputRow}>
      <Ionicons name={icon as any} size={16} color={colors.fg3} style={styles.inputIcon} />
      <TextInput style={styles.iconInputField} placeholderTextColor={colors.fg3} {...props} />
    </View>
  );
}

function fmtDOB(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EditProfileScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceRating, setLicenceRating] = useState('');
  const [country, setCountry] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [dobDraft, setDobDraft] = useState<Date>(new Date());
  const [homeDZ, setHomeDZ] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      setEmail(user.email ?? '');
      const { data } = await supabase.from('users').select('full_name, licence_number, licence_rating, country, date_of_birth, home_dropzone_id, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, dropzones:home_dropzone_id(name)').eq('id', user.id).single();
      if (data) {
        setFullName(data.full_name ?? '');
        setLicenceNumber(data.licence_number ?? '');
        setLicenceRating((data as any).licence_rating ?? '');
        setCountry((data as any).country ?? '');
        if (data.date_of_birth) setDob(new Date(data.date_of_birth));
        const dzName = (data as any).dropzones?.name ?? '';
        setHomeDZ(dzName);
        setEmergencyName(data.emergency_contact_name ?? '');
        setEmergencyRel(data.emergency_contact_relationship ?? '');
        setEmergencyPhone(data.emergency_contact_phone ?? '');
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) { Alert.alert('Error', 'Not signed in'); return; }
      // Resolve home DZ name → id (match web behaviour: lookup or create)
      let homeDzId: string | null = null;
      if (homeDZ.trim()) {
        const { data: existing } = await supabase.from('dropzones').select('id').ilike('name', homeDZ.trim()).limit(1).maybeSingle();
        if (existing) {
          homeDzId = existing.id;
        } else {
          const { data: newDz } = await supabase.from('dropzones').insert({ name: homeDZ.trim(), region: '' }).select('id').single();
          if (newDz) homeDzId = newDz.id;
        }
      }
      const { error } = await supabase.from('users').update({
        full_name: fullName.trim() || null,
        licence_number: licenceNumber.trim() || null,
        licence_rating: licenceRating.trim() || null,
        country: country.trim() || null,
        date_of_birth: dob ? dob.toISOString().split('T')[0] : null,
        home_dropzone_id: homeDzId,
        emergency_contact_name: emergencyName.trim() || null,
        emergency_contact_relationship: emergencyRel.trim() || null,
        emergency_contact_phone: emergencyPhone.trim() || null,
      } as any).eq('id', user.id);
      if (error) { Alert.alert('Error', error.message); return; }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>PERSONAL</Text>
          <FieldLabel text="FULL NAME" />
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor={colors.fg3} autoCapitalize="words" />

          <FieldLabel text="EMAIL" />
          <IconInput icon="mail-outline" value={email} editable={false} placeholder="email" selectTextOnFocus={false} />

          <FieldLabel text="LICENCE NUMBER" />
          <TextInput style={styles.input} value={licenceNumber} onChangeText={setLicenceNumber} placeholder="A-12345" placeholderTextColor={colors.fg3} autoCapitalize="none" autoCorrect={false} />

          <FieldLabel text="RATING" />
          <TextInput style={styles.input} value={licenceRating} onChangeText={setLicenceRating} placeholder="e.g. AFF-I, Coach" placeholderTextColor={colors.fg3} autoCapitalize="words" />

          <FieldLabel text="COUNTRY" />
          <TextInput style={styles.input} value={country} onChangeText={setCountry} placeholder="Australia" placeholderTextColor={colors.fg3} autoCapitalize="words" />

          <FieldLabel text="DATE OF BIRTH" />
          <TouchableOpacity
            style={styles.iconInputRow}
            onPress={() => { setDobDraft(dob ?? new Date()); setDobOpen(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.fg3} style={styles.inputIcon} />
            <Text style={[styles.iconInputField, { color: dob ? colors.fg : colors.fg3 }]}>
              {dob ? fmtDOB(dob) : 'Date of birth'}
            </Text>
          </TouchableOpacity>
          <Modal transparent animationType="slide" visible={dobOpen} onRequestClose={() => setDobOpen(false)}>
            <TouchableOpacity style={styles.dateModalOverlay} activeOpacity={1} onPress={() => setDobOpen(false)}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                <View style={styles.dateModalSheet}>
                  <View style={styles.dateModalToolbar}>
                    <TouchableOpacity onPress={() => setDobOpen(false)} style={styles.dateModalToolbarBtn}>
                      <Text style={styles.dateModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.dateModalTitle}>Date of Birth</Text>
                    <TouchableOpacity onPress={() => { setDob(dobDraft); setDobOpen(false); }} style={styles.dateModalToolbarBtn}>
                      <Text style={styles.dateModalDoneText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={dobDraft}
                    mode="date"
                    display="spinner"
                    maximumDate={new Date()}
                    onChange={(_, d) => { if (d) setDobDraft(d); }}
                    textColor={colors.fg}
                    themeVariant="dark"
                    style={{ height: 216 }}
                  />
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          <FieldLabel text="HOME DROPZONE" />
          <TextInput style={[styles.input, { marginBottom: spacing[6] }]} value={homeDZ} onChangeText={setHomeDZ} placeholder="Skydive somewhere" placeholderTextColor={colors.fg3} autoCapitalize="words" />

          <Text style={styles.sectionTitle}>EMERGENCY CONTACT</Text>
          <FieldLabel text="NAME" />
          <TextInput style={styles.input} value={emergencyName} onChangeText={setEmergencyName} placeholder="Jane Doe" placeholderTextColor={colors.fg3} autoCapitalize="words" />

          <FieldLabel text="RELATIONSHIP" />
          <TextInput style={styles.input} value={emergencyRel} onChangeText={setEmergencyRel} placeholder="Partner, Parent…" placeholderTextColor={colors.fg3} autoCapitalize="words" />

          <FieldLabel text="PHONE" />
          <IconInput icon="call-outline" value={emergencyPhone} onChangeText={setEmergencyPhone} placeholder="+1 555 000 0000" keyboardType="phone-pad" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: colors.fg },
  saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.sky },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[3], marginTop: spacing[2] },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg },
  iconInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginBottom: spacing[4] },
  inputIcon: { marginLeft: spacing[3] },
  iconInputField: { flex: 1, paddingLeft: spacing[2], paddingRight: spacing[3], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg },
  dateModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dateModalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 34 },
  dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: colors.border },
  dateModalToolbarBtn: { minWidth: 60 },
  dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.fg },
  dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg2 },
  dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: colors.sky, textAlign: 'right' },
});
