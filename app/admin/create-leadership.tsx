import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { adminRequest } from '../../lib/adminApi';
import { useAdminGuard } from '../../lib/useAdminGuard';

const C = { bg: '#090D16', card: '#121C2B', field: '#17243A', blue: '#3185FF', pale: '#8DBBFF', white: '#F7FAFF', muted: '#9AA9BE', line: '#293A52' };
const genders = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
type Gender = (typeof genders)[number] | '';
type Position = 'president' | 'vice_president';
type Form = {
  username: string; full_name: string; unit_name: string; unit: string; age: string;
  address: string; gender: Gender; contact_number: string; password: string; confirm_password: string;
};
const initial: Form = {
  username: '', full_name: '', unit_name: '', unit: '', age: '', address: '',
  gender: '', contact_number: '', password: '', confirm_password: '',
};

export default function CreateLeadershipScreen() {
  const router = useRouter();
  const { profile, checking } = useAdminGuard();
  const [position, setPosition] = useState<Position>('president');
  const [form, setForm] = useState<Form>(initial);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (key: keyof Form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const username = form.username.trim().toLowerCase();
    const age = Number(form.age);
    const contact = form.contact_number.trim();
    if (!username || !form.full_name.trim() || !form.unit_name.trim() || !form.unit.trim() ||
        !form.age.trim() || !form.address.trim() || !form.gender || !contact || !form.password || !form.confirm_password) {
      Alert.alert('Incomplete form', 'Please complete all account fields.'); return;
    }
    if (!/^[a-z0-9._]{3,24}$/.test(username)) {
      Alert.alert('Invalid username', 'Use 3–24 lowercase letters, numbers, dots, or underscores.'); return;
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) { Alert.alert('Invalid age', 'Enter a valid age.'); return; }
    if (!/^\+?[0-9][0-9\s()-]{6,18}$/.test(contact)) { Alert.alert('Invalid contact number', 'Please check the contact number.'); return; }
    if (form.password.length < 8 || form.password.length > 72 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      Alert.alert('Weak password', 'Use 8–72 characters with at least one letter and one number.'); return;
    }
    if (form.password !== form.confirm_password) { Alert.alert('Password mismatch', 'The passwords do not match.'); return; }

    setSaving(true);
    try {
      await adminRequest({
        action: 'create_leader',
        position,
        username,
        full_name: form.full_name.trim(),
        unit_name: form.unit_name.trim(),
        unit: form.unit.trim(),
        age,
        address: form.address.trim(),
        gender: form.gender,
        contact_number: contact,
        password: form.password,
        confirm_password: form.confirm_password,
      });
      Alert.alert(
        'Leadership account created',
        `${position === 'president' ? 'President' : 'Vice President'} account for ${form.full_name.trim()} has been created. Share the username and temporary password securely with the account holder.`,
        [{ text: 'Done', onPress: () => router.replace('/admin/accounts') }],
      );
      setForm(initial);
    } catch (error) {
      Alert.alert('Unable to create account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const field = (label: string, key: keyof Form, placeholder: string, options: {
    keyboardType?: 'default' | 'numeric' | 'phone-pad'; autoCapitalize?: 'none' | 'sentences' | 'words';
    multiline?: boolean; secure?: boolean; maxLength?: number;
  } = {}) => (
    <View style={styles.fieldBlock} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, options.multiline && styles.multiline]}
        value={form[key]}
        onChangeText={(value) => update(key, value)}
        placeholder={placeholder}
        placeholderTextColor="#718199"
        keyboardType={options.keyboardType ?? 'default'}
        autoCapitalize={options.autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        secureTextEntry={options.secure ? !showPassword : false}
        multiline={options.multiline}
        maxLength={options.maxLength}
      />
    </View>
  );

  if (checking || !profile) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹  ADMIN DASHBOARD</Text></Pressable>
          <Text style={styles.eyebrow}>ADMIN TOOLS / ACCOUNT CREATION</Text>
          <Text style={styles.title}>CREATE LEADERSHIP ACCOUNT.</Text>
          <Text style={styles.subtitle}>Only administrators can create President and Vice President accounts.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>SELECT LEADERSHIP POSITION</Text>
            <View style={styles.positionRow}>
              <PositionButton label="PRESIDENT" active={position === 'president'} onPress={() => setPosition('president')} />
              <PositionButton label="VICE PRESIDENT" active={position === 'vice_president'} onPress={() => setPosition('vice_president')} />
            </View>

            <Text style={[styles.cardTitle, styles.sectionSpacing]}>ACCOUNT INFORMATION</Text>
            {field('USERNAME', 'username', 'Choose a unique username', { autoCapitalize: 'none', maxLength: 24 })}
            {field('FULL NAME', 'full_name', 'Complete name', { maxLength: 100 })}
            {field('NAME OF UNIT', 'unit_name', 'Name of the unit', { maxLength: 100 })}
            {field('UNIT', 'unit', 'Unit / chapter', { maxLength: 100 })}
            {field('AGE', 'age', 'Age', { keyboardType: 'numeric', autoCapitalize: 'none', maxLength: 3 })}
            {field('ADDRESS', 'address', 'Complete address', { multiline: true, maxLength: 300 })}

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>GENDER</Text>
              <View style={styles.genderWrap}>
                {genders.map((item) => {
                  const selected = form.gender === item;
                  return <Pressable key={item} onPress={() => update('gender', item)} style={[styles.genderChip, selected && styles.genderChipActive]}>
                    <Text style={[styles.genderText, selected && styles.genderTextActive]}>{item}</Text>
                  </Pressable>;
                })}
              </View>
            </View>

            {field('CONTACT NUMBER', 'contact_number', '09XXXXXXXXX or +639XXXXXXXXX', { keyboardType: 'phone-pad', autoCapitalize: 'none', maxLength: 24 })}
            {field('TEMPORARY PASSWORD', 'password', 'At least 8 characters and one number', { autoCapitalize: 'none', secure: true, maxLength: 72 })}
            {field('CONFIRM PASSWORD', 'confirm_password', 'Re-enter the password', { autoCapitalize: 'none', secure: true, maxLength: 72 })}
            <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showPassword}><Text style={styles.showPasswordText}>{showPassword ? 'HIDE PASSWORDS' : 'SHOW PASSWORDS'}</Text></Pressable>

            <View style={styles.roleNote}>
              <Text style={styles.roleNoteTitle}>ACCOUNT ACCESS</Text>
              <Text style={styles.roleNoteValue}>{position === 'president' ? 'PRESIDENT' : 'VICE PRESIDENT'}</Text>
              <Text style={styles.roleNoteCopy}>The account will be assigned the President/VP role automatically. No admin password or secret key is stored in this app.</Text>
            </View>

            <Pressable onPress={submit} disabled={saving} style={[styles.submit, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color="#061326" /> : <Text style={styles.submitText}>CREATE {position === 'president' ? 'PRESIDENT' : 'VICE PRESIDENT'} ACCOUNT</Text>}
            </Pressable>
          </View>
          <Text style={styles.footer}>KRIANSTYLE ADMIN • SECURE ACCOUNT CREATION</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PositionButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.positionButton, active && styles.positionButtonActive]}><Text style={[styles.positionButtonText, active && styles.positionButtonTextActive]}>{label}</Text></Pressable>;
}
function Loading() { return <SafeAreaView style={[styles.safe, styles.loading]}><ActivityIndicator color={C.blue} /><Text style={styles.subtitle}>Checking administrator access...</Text></SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, flex: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 19, paddingTop: 13, paddingBottom: 35 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 15 }, backText: { color: C.pale, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: C.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1.8, marginTop: 12 },
  title: { color: C.white, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  subtitle: { color: C.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginTop: 21 },
  cardTitle: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  positionRow: { flexDirection: 'row', gap: 9, marginTop: 13 },
  positionButton: { flex: 1, minHeight: 45, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.field },
  positionButtonActive: { borderColor: C.blue, backgroundColor: '#17375F' },
  positionButtonText: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  positionButtonTextActive: { color: C.pale }, sectionSpacing: { marginTop: 25, marginBottom: 2 },
  fieldBlock: { marginTop: 14 }, label: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 },
  input: { minHeight: 47, borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.field, color: C.white, paddingHorizontal: 12, fontSize: 12 },
  multiline: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  genderWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  genderChip: { borderWidth: 1, borderColor: C.line, borderRadius: 25, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: C.field },
  genderChipActive: { backgroundColor: '#17375F', borderColor: C.blue },
  genderText: { color: C.muted, fontSize: 9, fontWeight: '700' }, genderTextActive: { color: C.pale },
  showPassword: { alignSelf: 'flex-end', paddingVertical: 11 }, showPasswordText: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  roleNote: { borderWidth: 1, borderColor: '#315F9B', backgroundColor: '#10223D', borderRadius: 11, padding: 12, marginTop: 11 },
  roleNoteTitle: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  roleNoteValue: { color: C.blueLight, fontSize: 12, fontWeight: '900', marginTop: 5 },
  roleNoteCopy: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 5 },
  submit: { minHeight: 49, borderRadius: 11, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18, paddingHorizontal: 8 },
  submitText: { color: '#061326', fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }, disabled: { opacity: 0.65 },
  footer: { color: '#66758B', fontSize: 7, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 24 },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
