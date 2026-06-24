import { useCallback, useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { spacing, radii } from '@/constants/tokens';
import type { ColorSet } from '@/constants/tokens';
import { useColors } from '@/lib/theme';
import { usePrefs, fmtJumpDateTime } from '@/lib/prefsContext';
import type { JumpFull, TagData } from '@/lib/types';
import { JUMP_TYPES } from '@/lib/jumpTypes';
import { CollapsibleChipRow } from '@/components/log/CollapsibleChipRow';

function sanitizeJumpType(text: string): string | null {
  if (!text.trim()) return null;
  const t = text.trim();
  const exact = JUMP_TYPES.find(v => v.toLowerCase() === t.toLowerCase());
  if (exact) return exact;
  const starts = JUMP_TYPES.find(v => t.toLowerCase().startsWith(v.toLowerCase()));
  if (starts) return starts;
  const contains = JUMP_TYPES.find(v => t.toLowerCase().includes(v.toLowerCase()));
  if (contains) return contains;
  return 'AFF';
}

function fmtMSS(s: number | null): string {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function parseMSS(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  if (!trimmed.includes(':')) {
    // Plain seconds: "272"
    const n = parseInt(trimmed, 10);
    return isNaN(n) ? null : n;
  }
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const m = parseInt(parts[0], 10), sec = parseInt(parts[1], 10);
  return isNaN(m) || isNaN(sec) ? null : m * 60 + sec;
}

function Label({ text }: { text: string }) {
  const colors = useColors();
  return <Text style={{ fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: colors.fg3, marginBottom: spacing[1.5] }}>{text}</Text>;
}

export default function EditJumpScreen() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { prefs } = usePrefs();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [jump, setJump] = useState<JumpFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  // Form state
  const [dzName, setDzName] = useState('');
  const [acType, setAcType] = useState('');
  const [acRego, setAcRego] = useState('');
  const [exitAlt, setExitAlt] = useState('');
  const [ffSecs, setFfSecs] = useState('');
  const [canopyInput, setCanopyInput] = useState('');
  const [pullAlt, setPullAlt] = useState('');
  const [jumpType, setJumpType] = useState('');
  const [notes, setNotes] = useState('');
  const [aadFired, setAadFired] = useState(false);
  const [reserveDeployed, setReserveDeployed] = useState(false);
  const [plannedObjectives, setPlannedObjectives] = useState('');
  const [plannedManoeuvres, setPlannedManoeuvres] = useState('');
  const [landingAccuracyValue, setLandingAccuracyValue] = useState('');
  const [landingAccuracyUnit, setLandingAccuracyUnit] = useState('M');
  const [canopyType, setCanopyType] = useState('');
  const [canopyGearId, setCanopyGearId] = useState<string | null>(null);
  const [userCanopies, setUserCanopies] = useState<Array<{ id: string; make_model: string }>>([]);
  const [peopleOnJump, setPeopleOnJump] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [userTags, setUserTags] = useState<TagData[]>([]);

  useFocusEffect(useCallback(() => {
    (async () => {
      const { data } = await supabase
        .from('jumps')
        .select('*, dropzones(name, region, latitude, longitude)')
        .eq('id', id)
        .single();
      if (data) {
        const j = data as JumpFull;
        setJump(j);
        setDzName(j.dropzones?.name ?? '');
        setAcType(j.aircraft_type ?? '');
        setAcRego(j.aircraft_rego ?? '');
        setExitAlt(String(j.exit_altitude_ft ?? ''));
        setFfSecs(String(j.freefall_seconds ?? ''));
        setCanopyInput(fmtMSS(j.canopy_seconds));
        setPullAlt(String(j.pull_altitude_ft ?? ''));
        setJumpType(j.jumper_type === 'student' ? ((j as any).jump_stage ?? j.jump_type ?? '') : (j.jump_type ?? ''));
        setNotes(j.notes ?? '');
        setAadFired(j.aad_fired ?? false);
        setReserveDeployed(j.reserve_deployed ?? false);
        setPlannedObjectives(j.planned_objectives ?? '');
        setPlannedManoeuvres(j.planned_manoeuvres ?? '');
        setLandingAccuracyValue(j.landing_accuracy_value ?? '');
        setLandingAccuracyUnit(j.landing_accuracy_unit ?? 'M');
        setCanopyType((j as any).canopy_type ?? '');
        setCanopyGearId((j as any).canopy_gear_id ?? null);
        setPeopleOnJump(String((j as any).people_on_jump ?? ''));
      }
      // Load user canopies + tags in parallel
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const [{ data: canopies }, { data: tags }, { data: jumpTagRows }] = await Promise.all([
          supabase.from('gear').select('id, make_model').eq('user_id', session.user.id).eq('type', 'canopy').order('make_model'),
          supabase.from('tags').select('id, name, color').eq('user_id', session.user.id).order('created_at', { ascending: true }),
          supabase.from('jump_tags').select('tag_id').eq('jump_id', id),
        ]);
        setUserCanopies(canopies ?? []);
        setUserTags((tags as TagData[]) ?? []);
        setSelectedTagIds((jumpTagRows ?? []).map((r: any) => r.tag_id));
      }
      // Check if this jump has a signature
      const { count } = await supabase.from('signatures').select('id', { count: 'exact', head: true }).eq('jump_id', id);
      setIsSigned((count ?? 0) > 0);
      setLoading(false);
    })();
  }, [id]));

  const handleSave = async () => {
    if (!jump) return;

    const doSave = async () => {
      setSaving(true);
      try {
        let dropzoneId = jump.dropzone_id;
        if (dzName.trim() !== (jump.dropzones?.name ?? '')) {
          const { data: dzRows } = await supabase.from('dropzones').select('id').ilike('name', dzName.trim()).limit(1);
          if (dzRows && dzRows.length > 0) {
            dropzoneId = dzRows[0].id;
          } else if (dzName.trim()) {
            const { data: newDz } = await supabase.from('dropzones').insert({ name: dzName.trim(), region: '' }).select('id').single();
            if (newDz) dropzoneId = newDz.id;
          }
      }
        const { error } = await supabase.from('jumps').update({
          dropzone_id: dropzoneId,
          aircraft_type: acType.trim() || null,
          aircraft_rego: acRego.trim() || null,
          exit_altitude_ft: parseInt(exitAlt, 10) || null,
          freefall_seconds: parseInt(ffSecs, 10) || null,
          canopy_seconds: canopyInput ? parseMSS(canopyInput) : null,
          pull_altitude_ft: parseInt(pullAlt, 10) || null,
          jump_type: jump.jumper_type === 'student' ? sanitizeJumpType(jumpType) : (jumpType || null),
          jump_stage: jump.jumper_type === 'student' ? (jumpType.trim() || null) : null,
          notes: notes.trim() || null,
          aad_fired: aadFired,
          reserve_deployed: reserveDeployed,
          planned_objectives: jump.jumper_type === 'student' ? (plannedObjectives.trim() || null) : null,
          planned_manoeuvres: jump.jumper_type === 'student' ? (plannedManoeuvres.trim() || null) : null,
          landing_accuracy_value: landingAccuracyValue.trim() || null,
          landing_accuracy_unit: landingAccuracyValue.trim() ? landingAccuracyUnit : null,
          canopy_type: canopyType.trim() || null,
          canopy_gear_id: canopyGearId || null,
          people_on_jump: parseInt(peopleOnJump, 10) || null,
        }).eq('id', id);
        if (error) { Alert.alert('Error', error.message); return; }

        // Compute what changed so the signer can review it
        type Change = { field: string; from: string; to: string };
        const changes: Change[] = [];
        const origDz = jump.dropzones?.name ?? '';
        if (dzName.trim() !== origDz)
          changes.push({ field: 'Dropzone', from: origDz || '—', to: dzName.trim() || '—' });
        const origAc = [jump.aircraft_type, jump.aircraft_rego].filter(Boolean).join(' · ');
        const newAc  = [acType.trim(), acRego.trim()].filter(Boolean).join(' · ');
        if (newAc !== origAc)
          changes.push({ field: 'Aircraft', from: origAc || '—', to: newAc || '—' });
        if (exitAlt !== String(jump.exit_altitude_ft ?? ''))
          changes.push({ field: 'Exit altitude', from: jump.exit_altitude_ft ? `${jump.exit_altitude_ft} ft` : '—', to: exitAlt ? `${exitAlt} ft` : '—' });
        if (ffSecs !== String(jump.freefall_seconds ?? ''))
          changes.push({ field: 'Freefall', from: jump.freefall_seconds ? `${jump.freefall_seconds}s` : '—', to: ffSecs ? `${ffSecs}s` : '—' });
        if (canopyInput !== fmtMSS(jump.canopy_seconds))
          changes.push({ field: 'Canopy', from: fmtMSS(jump.canopy_seconds) || '—', to: canopyInput || '—' });
        if (pullAlt !== String(jump.pull_altitude_ft ?? ''))
          changes.push({ field: 'Pull altitude', from: jump.pull_altitude_ft ? `${jump.pull_altitude_ft} ft` : '—', to: pullAlt ? `${pullAlt} ft` : '—' });
        if (jumpType !== (jump.jump_type ?? ''))
          changes.push({ field: 'Jump type', from: jump.jump_type || '—', to: jumpType || '—' });
        const origLandingFull = jump.landing_accuracy_value
          ? `${jump.landing_accuracy_value} ${jump.landing_accuracy_unit ?? ''}`.trim()
          : '';
        const newLandingFull = landingAccuracyValue.trim()
          ? `${landingAccuracyValue.trim()} ${landingAccuracyUnit}`.trim()
          : '';
        if (newLandingFull !== origLandingFull)
          changes.push({ field: 'Landing accuracy', from: origLandingFull || '—', to: newLandingFull || '—' });
        if (notes.trim() !== (jump.notes ?? ''))
          changes.push({ field: 'Notes', from: jump.notes || '—', to: notes.trim() || '—' });
        if (aadFired !== (jump.aad_fired ?? false))
          changes.push({ field: 'AAD fired', from: jump.aad_fired ? 'Yes' : 'No', to: aadFired ? 'Yes' : 'No' });
        if (reserveDeployed !== (jump.reserve_deployed ?? false))
          changes.push({ field: 'Reserve deployed', from: jump.reserve_deployed ? 'Yes' : 'No', to: reserveDeployed ? 'Yes' : 'No' });
        if (plannedObjectives.trim() !== (jump.planned_objectives ?? ''))
          changes.push({ field: 'Planned objectives', from: jump.planned_objectives || '—', to: plannedObjectives.trim() || '—' });
        if (plannedManoeuvres.trim() !== (jump.planned_manoeuvres ?? ''))
          changes.push({ field: 'Planned manoeuvres', from: jump.planned_manoeuvres || '—', to: plannedManoeuvres.trim() || '—' });

        // Persist the audit trail to jump_edits
        if (changes.length > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase.from('jump_edits').insert({
              jump_id: id,
              user_id: session.user.id,
              changes,
            });
          }
        }

        // Sync tags: delete all existing, re-insert selected
        await supabase.from('jump_tags').delete().eq('jump_id', id);
        if (selectedTagIds.length > 0) {
          await supabase.from('jump_tags')
            .insert(selectedTagIds.map(tag_id => ({ jump_id: id, tag_id })))
            .then(null, () => null);
        }

        // Delete old signature — jump has been edited, re-signing required
        await supabase.from('signatures').delete().eq('jump_id', id);
        router.replace({ pathname: '/(tabs)/log/instructor-sign', params: { jumpId: id, changes: changes.length > 0 ? JSON.stringify(changes) : '' } });
      } finally {
        setSaving(false);
      }
    };

    if (isSigned) {
      Alert.alert(
        'Re-signing required',
        'Editing this jump will invalidate the existing signature. You\'ll need to sign again after saving.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save & re-sign', onPress: doSave },
        ],
      );
    } else {
      await doSave();
    }
  };

  const handleDelete = () => {
    Alert.alert(`Delete Jump #${jump?.jump_number}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const { error, count } = await supabase
            .from('jumps')
            .delete({ count: 'exact' })
            .eq('id', id);
          if (error || count === 0) {
            Alert.alert('Error', error?.message ?? 'Jump could not be deleted. Please try again.');
            return;
          }
          router.replace('/(tabs)/log');
        },
      },
    ]);
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.bg }]}><ActivityIndicator color={colors.sky} /></View>;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerClose} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={colors.fg} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit jump #{jump?.jump_number}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.7}>
          {saving ? <ActivityIndicator size="small" color={colors.sky} /> : <Text style={styles.saveBtn}>Save</Text>}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

          <Label text="DATE" />
          <View style={styles.inputReadonly}><Text style={styles.inputReadonlyText}>{fmtJumpDateTime(jump?.date, prefs.dateFormat)}</Text></View>

          <Label text="DROPZONE" />
          <View style={styles.inputWithIcon}>
            <Ionicons name="location-outline" size={16} color={colors.fg3} style={styles.inputIcon} />
            <TextInput style={styles.inputInner} value={dzName} onChangeText={setDzName} placeholder="Skydive Picton" placeholderTextColor={colors.fg3} autoCapitalize="words" autoCorrect={false} />
          </View>

          <Label text="AIRCRAFT" />
          <View style={styles.inputWithIcon}>
            <Ionicons name="airplane-outline" size={16} color={colors.fg3} style={styles.inputIcon} />
            <TextInput style={styles.inputInner} value={`${acType}${acRego ? ' · ' + acRego : ''}`} onChangeText={(v) => { setAcType(v); }} placeholder="PAC 750XL · VH-PXM" placeholderTextColor={colors.fg3} autoCapitalize="words" autoCorrect={false} />
          </View>

          <View style={styles.row2}>
            <View style={styles.flex}>
              <Label text="EXIT (FT)" />
              <TextInput style={styles.input} value={exitAlt} onChangeText={setExitAlt} keyboardType="numeric" placeholderTextColor={colors.fg3} />
            </View>
            <View style={styles.flex}>
              <Label text="FREEFALL (S)" />
              <TextInput style={styles.input} value={ffSecs} onChangeText={setFfSecs} keyboardType="numeric" placeholder="60" placeholderTextColor={colors.fg3} />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.flex}>
              <Label text="CANOPY TIME (M:SS)" />
              <TextInput style={styles.input} value={canopyInput} onChangeText={setCanopyInput} placeholder="4:32" placeholderTextColor={colors.fg3} />
            </View>
            <View style={styles.flex}>
              <Label text="PULL ALT (FT)" />
              <TextInput style={styles.input} value={pullAlt} onChangeText={setPullAlt} keyboardType="numeric" placeholder="3500" placeholderTextColor={colors.fg3} />
            </View>
          </View>

          <Label text="JUMP TYPE" />
          <CollapsibleChipRow
            items={[...JUMP_TYPES]}
            gap={8}
            renderChip={(t) => (
              <TouchableOpacity style={[styles.chip, jumpType === t && styles.chipActive]} onPress={() => setJumpType(jumpType === t ? '' : t)} activeOpacity={0.7}>
                <Text style={[styles.chipText, jumpType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            )}
          />

          <Label text="CANOPY TYPE" />
          {jump?.jumper_type !== 'student' && userCanopies.length > 0 && (
            <View style={styles.chipRow}>
              {userCanopies.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, canopyGearId === c.id && styles.chipActive]}
                  onPress={() => {
                    if (canopyGearId === c.id) { setCanopyGearId(null); setCanopyType(''); }
                    else { setCanopyGearId(c.id); setCanopyType(c.make_model); }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, canopyGearId === c.id && styles.chipTextActive]}>{c.make_model}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <TextInput
            style={styles.input}
            value={canopyType}
            onChangeText={v => { setCanopyType(v); setCanopyGearId(null); }}
            placeholder="e.g. Sabre 2 170"
            placeholderTextColor={colors.fg3}
            autoCapitalize="words"
            autoCorrect={false}
          />

          <Label text="LANDING ACCURACY — optional" />
          <View style={styles.row2}>
            <View style={styles.flex}>
              <TextInput
                style={styles.input}
                value={landingAccuracyValue}
                onChangeText={setLandingAccuracyValue}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.fg3}
              />
            </View>
            <View style={[styles.chipRow, { flex: 1, marginBottom: 0 }]}>
              {['CM', 'M', 'FT'].map(u => (
                <TouchableOpacity key={u} style={[styles.chip, landingAccuracyUnit === u && styles.chipActive]} onPress={() => setLandingAccuracyUnit(u)} activeOpacity={0.7}>
                  <Text style={[styles.chipText, landingAccuracyUnit === u && styles.chipTextActive]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {jump?.jumper_type === 'student' && (<>
            <Label text="PLANNED OBJECTIVES" />
            <TextInput style={[styles.input, styles.textarea]} value={plannedObjectives} onChangeText={setPlannedObjectives} multiline numberOfLines={3} placeholder="What was the student expected to achieve?" placeholderTextColor={colors.fg3} textAlignVertical="top" />
            <Label text="PLANNED MANOEUVRES" />
            <TextInput style={[styles.input, styles.textarea]} value={plannedManoeuvres} onChangeText={setPlannedManoeuvres} multiline numberOfLines={3} placeholder="Specific manoeuvres or exercises planned" placeholderTextColor={colors.fg3} textAlignVertical="top" />
          </>)}

          <Label text="JUMP DESCRIPTION" />
          <TextInput style={[styles.input, styles.textarea]} value={notes} onChangeText={setNotes} multiline numberOfLines={4} placeholderTextColor={colors.fg3} textAlignVertical="top" />

          <TouchableOpacity style={styles.checkRow} onPress={() => setAadFired(v => !v)} activeOpacity={0.7}>
            <Ionicons name={aadFired ? 'checkbox' : 'square-outline'} size={22} color={aadFired ? colors.warn : colors.fg3} />
            <View>
              <Text style={styles.checkTitle}>AAD fired</Text>
              <Text style={styles.checkSub}>Automatic Activation Device deployed.</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkRow} onPress={() => setReserveDeployed(v => !v)} activeOpacity={0.7}>
            <Ionicons name={reserveDeployed ? 'checkbox' : 'square-outline'} size={22} color={reserveDeployed ? colors.warn : colors.fg3} />
            <View>
              <Text style={styles.checkTitle}>Reserve deployed</Text>
              <Text style={styles.checkSub}>Reserve parachute was deployed on this jump.</Text>
            </View>
          </TouchableOpacity>

          <Label text="PEOPLE ON JUMP (optional)" />
          <TextInput style={styles.input} value={peopleOnJump} onChangeText={setPeopleOnJump} keyboardType="numeric" placeholder="e.g. 4" placeholderTextColor={colors.fg3} />

          {userTags.length > 0 && (<>
            <Label text="TAGS" />
            <View style={styles.chipRow}>
              {userTags.map(tag => {
                const active = selectedTagIds.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.chip, { borderColor: tag.color, backgroundColor: active ? tag.color : colors.surface2, flexDirection: 'row', alignItems: 'center', gap: 5 }]}
                    onPress={() => setSelectedTagIds(prev => active ? prev.filter(id => id !== tag.id) : [...prev, tag.id])}
                    activeOpacity={0.7}
                  >
                    {!active && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: tag.color }} />}
                    <Text style={[styles.chipText, { color: active ? colors.onSky : colors.fg2 }]}>{tag.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>)}

          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
            <Text style={styles.deleteBtnText}>Delete jump</Text>
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
  headerClose: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'InterTight-SemiBold', fontSize: 17, color: c.fg },
  saveBtn: { fontFamily: 'InterTight-SemiBold', fontSize: 15, color: c.sky, width: 36, textAlign: 'right' },
  body: { paddingHorizontal: spacing[5], paddingVertical: spacing[4], paddingBottom: spacing[10] },
  label: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.8, color: c.fg3, marginBottom: spacing[1.5] },
  input: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4], fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg },
  inputWithIcon: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, marginBottom: spacing[4] },
  inputIcon: { marginLeft: spacing[3] },
  inputInner: { flex: 1, paddingLeft: spacing[2], paddingRight: spacing[3], paddingVertical: spacing[3], fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg },
  inputReadonly: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, paddingHorizontal: spacing[3], paddingVertical: spacing[3], marginBottom: spacing[4] },
  inputReadonlyText: { fontFamily: 'InterTight-Regular', fontSize: 15, color: c.fg2 },
  textarea: { minHeight: 100, paddingTop: spacing[3] },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: radii.md, padding: spacing[4], marginBottom: spacing[4] },
  checkTitle: { fontFamily: 'InterTight-Medium', fontSize: 15, color: c.fg },
  checkSub: { fontFamily: 'InterTight-Regular', fontSize: 12, color: c.fg2, marginTop: 2 },
  row2: { flexDirection: 'row', gap: spacing[3] },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[1], marginBottom: spacing[4] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1.5], borderRadius: radii.pill, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
  chipActive: { backgroundColor: c.sky, borderColor: c.sky },
  chipText: { fontFamily: 'InterTight-Medium', fontSize: 13, color: c.fg2 },
  chipTextActive: { color: c.onSky },
  deleteBtn: { paddingVertical: spacing[4] },
  deleteBtnText: { fontFamily: 'InterTight-Medium', fontSize: 14, color: c.danger },
  });
}
