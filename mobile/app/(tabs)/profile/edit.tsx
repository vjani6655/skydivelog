import { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, FlatList, StyleSheet,  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { COUNTRIES } from '@/constants/countries';
import { DIAL_CODES } from '@/constants/dialCodes';

function FieldLabel({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

function IconInput({ icon, rowStyle, ...props }: { icon: string; rowStyle?: object } & React.ComponentProps<typeof TextInput>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[styles.iconInputRow, rowStyle]}>
      <Ionicons name={icon as any} size={16} color={colors.fg3} style={styles.inputIcon} />
      <TextInput style={styles.iconInputField} placeholderTextColor={colors.fg3} {...props} />
    </View>
  );
}

function fmtDOB(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EditProfileScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [licenceRating, setLicenceRating] = useState('');
  const [country, setCountry] = useState('');
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [dobOpen, setDobOpen] = useState(false);
  const [dobDraft, setDobDraft] = useState<Date>(new Date());
  const [phone, setPhone] = useState('');
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
      const { data } = await supabase.from('users').select('full_name, licence_number, licence_rating, country, date_of_birth, phone, home_dropzone_id, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, dropzones:home_dropzone_id(name)').eq('id', user.id).single();
      if (data) {
        setFullName(data.full_name ?? '');
        setLicenceNumber(data.licence_number ?? '');
        setLicenceRating((data as any).licence_rating ?? '');
        setCountry((data as any).country ?? '');
        if (data.date_of_birth) setDob(new Date(data.date_of_birth));
        setPhone((data as any).phone ?? '');
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
        phone: phone.trim() || null,
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
    <SafeAreaView style={styles.screen} edges={['top']}>
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
          <TextInput style={[styles.input, { marginBottom: 4, opacity: 0.5 }]} value={fullName} editable={false} placeholderTextColor={colors.fg3} />
          <Text style={styles.hint}>Contact support to request changes</Text>

          <FieldLabel text="EMAIL" />
          <IconInput icon="mail-outline" value={email} editable={false} placeholder="email" selectTextOnFocus={false} rowStyle={{ opacity: 0.5, marginBottom: 4 }} />
          <Text style={styles.hint}>Contact support to request changes</Text>

          <FieldLabel text="LICENCE NUMBER" />
          <TextInput style={[styles.input, { marginBottom: 4 }]} value={licenceNumber} onChangeText={setLicenceNumber} placeholder="APF-2457830" placeholderTextColor={colors.fg3} autoCapitalize="characters" autoCorrect={false} />
          <Text style={styles.hint}>Your APF number, or the number provided by your governing body</Text>

          <FieldLabel text="RATING" />
          <TextInput style={[styles.input, { marginBottom: 4 }]} value={licenceRating} onChangeText={setLicenceRating} placeholder="B-237 or D-1897" placeholderTextColor={colors.fg3} autoCapitalize="characters" autoCorrect={false} />
          <Text style={styles.hint}>Your latest rating, e.g. B-237 or D-1897</Text>

          <FieldLabel text="COUNTRY" />
          <TouchableOpacity
            style={styles.iconInputRow}
            onPress={() => { setCountrySearch(''); setCountryModalOpen(true); }}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={16} color={colors.fg3} style={styles.inputIcon} />
            <Text style={[styles.iconInputField, { color: country ? colors.fg : colors.fg3 }]}>
              {country || 'Select country…'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.fg3} style={{ marginRight: spacing[3] }} />
          </TouchableOpacity>

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
          {Platform.OS === 'android' ? (
            dobOpen && (
              <DateTimePicker
                value={dobDraft}
                mode="date"
                display="default"
                maximumDate={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 10); return d; })()}
                onChange={(_, d) => {
                  setDobOpen(false);
                  if (d) {
                    const cutoff = new Date();
                    cutoff.setFullYear(cutoff.getFullYear() - 10);
                    if (d >= cutoff) { Alert.alert('Invalid date', 'Date of birth must be more than 10 years ago.'); return; }
                    setDobDraft(d);
                    setDob(d);
                  }
                }}
              />
            )
          ) : (
            <Modal transparent animationType="slide" visible={dobOpen} onRequestClose={() => setDobOpen(false)}>
              <TouchableOpacity style={styles.dateModalOverlay} activeOpacity={1} onPress={() => setDobOpen(false)}>
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <View style={styles.dateModalSheet}>
                    <View style={styles.dateModalToolbar}>
                      <TouchableOpacity onPress={() => setDobOpen(false)} style={styles.dateModalToolbarBtn}>
                        <Text style={styles.dateModalCancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <Text style={styles.dateModalTitle}>Date of Birth</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const cutoff = new Date();
                          cutoff.setFullYear(cutoff.getFullYear() - 10);
                          if (dobDraft >= cutoff) {
                            Alert.alert('Invalid date', 'Date of birth must be more than 10 years ago.');
                            return;
                          }
                          setDob(dobDraft);
                          setDobOpen(false);
                        }}
                        style={styles.dateModalToolbarBtn}
                      >
                        <Text style={styles.dateModalDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={dobDraft}
                      mode="date"
                      display="spinner"
                      maximumDate={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 10); return d; })()}
                      onChange={(_, d) => { if (d) setDobDraft(d); }}
                      textColor={colors.fg}
                      themeVariant="dark"
                      style={{ height: 216 }}
                    />
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Country picker modal */}
          <Modal transparent animationType="slide" visible={countryModalOpen} onRequestClose={() => setCountryModalOpen(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.dateModalOverlay}>
              <View style={[styles.dateModalSheet, { maxHeight: '75%' }]}>
                <View style={styles.dateModalToolbar}>
                  <TouchableOpacity onPress={() => setCountryModalOpen(false)} style={styles.dateModalToolbarBtn}>
                    <Text style={styles.dateModalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.dateModalTitle}>Country</Text>
                  <View style={{ width: 60 }} />
                </View>
                <View style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
                  <View style={[styles.iconInputRow, { marginBottom: 0 }]}>
                    <Ionicons name="search" size={15} color={colors.fg3} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.iconInputField, { paddingVertical: spacing[2] }]}
                      value={countrySearch}
                      onChangeText={setCountrySearch}
                      placeholder="Search…"
                      placeholderTextColor={colors.fg3}
                      autoCorrect={false}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
                <FlatList
                  data={COUNTRIES.filter(c => c.toLowerCase().includes(countrySearch.toLowerCase()))}
                  keyExtractor={item => item}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={{ paddingHorizontal: spacing[5], paddingVertical: spacing[3.5], borderBottomWidth: 1, borderBottomColor: colors.border }}
                      onPress={() => { setCountry(item); setCountryModalOpen(false); }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 15, color: item === country ? colors.sky : colors.fg }}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={{ flexGrow: 0 }}
                />
              </View>
            </View>
            </KeyboardAvoidingView>
          </Modal>

          <FieldLabel text="PHONE" />
          {(() => {
            const dialCode = DIAL_CODES[country] ?? null;
            return (
              <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, marginBottom: spacing[4], alignItems: 'center' }}>
                <Ionicons name="call-outline" size={16} color={colors.fg3} style={{ marginLeft: spacing[3] }} />
                {dialCode ? (
                  <Text style={{ fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg2, paddingLeft: spacing[2], paddingRight: spacing[1] }}>{dialCode}</Text>
                ) : null}
                <TextInput
                  style={{ flex: 1, paddingLeft: dialCode ? spacing[1] : spacing[2], paddingRight: spacing[3], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 15, color: colors.fg }}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={dialCode ? '400 000 000' : '+61 400 000 000'}
                  placeholderTextColor={colors.fg3}
                  keyboardType="phone-pad"
                />
              </View>
            );
          })()}

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

function makeStyles(c: ColorSet) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[5], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky },
  body: { padding: spacing[5], paddingBottom: spacing[12] },
  sectionTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[3], marginTop: spacing[2] },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg },
  hint: { fontFamily: 'InterTight-Regular', fontSize: 11, color: c.fg4, marginBottom: spacing[4] },
  iconInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, marginBottom: spacing[4] },
  inputIcon: { marginLeft: spacing[3] },
  iconInputField: { flex: 1, paddingLeft: spacing[2], paddingRight: spacing[3], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg },
  dateModalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dateModalSheet: { backgroundColor: c.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingBottom: 34 },
  dateModalToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderBottomWidth: 1, borderBottomColor: c.border },
  dateModalToolbarBtn: { minWidth: 60 },
  dateModalTitle: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.fg },
  dateModalCancelText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2 },
  dateModalDoneText: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky, textAlign: 'right' },
  });
}
