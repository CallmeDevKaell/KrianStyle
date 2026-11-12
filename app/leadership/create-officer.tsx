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
import { createOfficerAccount, type OfficerAccountInput, type OfficerPosition } from '../../lib/leadershipApi';
import { useLeadershipGuard } from '../../lib/useLeadershipGuard';

const C = { bg: '#090D16', card: '#121C2B', field: '#17243A', blue: '#3185FF', pale: '#8DBBFF', white: '#F7FAFF', muted: '#9AA9BE', line: '#293A52', green: '#4DD6A0' };
type OfficerForm = Omit<OfficerAccountInput, 'officer_position'> & { officer_position: OfficerPosition | '' };
type FormKey = keyof OfficerForm;
const initial: OfficerForm = {
  officer_position: '',
  username: '', full_name: '', unit_name: '', unit: '', age: 18, address: '',
  gender: 'Male', contact_number: '', password: '', confirm_password: '',
};

export default function CreateOfficerScreen() {
  const router = useRouter();
  const { profile, checking } = useLeadershipGuard();
  const [form, setForm] = useState<OfficerForm>(initial);
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (key: FormKey, value: string | number) => setForm((current) => {
    const next = { ...current };
    (next as Record<FormKey, string | number>)[key] = value;
    return next;
  });

  const submit = async () => {
    if (!profile) return;
    const normalized = { ...form, username: form.username.trim().toLowerCase(), full_name: form.full_name.trim(), unit_name: form.unit_name.trim(), unit: form.unit.trim(), address: form.address.trim(), contact_number: form.contact_number.trim() };
    if (!normalized.officer_position) {
      Alert.alert('Choose Officer position', 'Select the Officer area for this account before continuing.');
      return;
    }
    if (!normalized.username || !normalized.full_name || !normalized.unit_name || !normalized.unit || !normalized.address || !normalized.contact_number) {
      Alert.alert('Missing information', 'Please complete all required fields.');
      return;
    }
    if (normalized.password !== normalized.confirm_password) {
      Alert.alert('Password mismatch', 'Password and Confirm Password must match.');
      return;
    }
    if (normalized.password.length < 8 || !/[A-Za-z]/.test(normalized.password) || !/[0-9]/.test(normalized.password)) {
      Alert.alert('Weak password', 'Use at least 8 characters with at least one letter and one number.');
      return;
    }

    setSaving(true);
    try {
      const result = await createOfficerAccount(normalized as OfficerAccountInput);
      Alert.alert(
        result.approval_status === 'approved' ? 'Officer account created' : 'Request submitted',
        result.message,
        [{ text: 'OK', onPress: () => router.replace('/leadership/accounts') }],
      );
    } catch (error) {
      Alert.alert('Unable to create account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (checking || !profile) return <Loading />;
  const isPresident = profile.position === 'president';

  const field = (label: string, key: FormKey, placeholder: string, options: { keyboard?: 'default' | 'numeric' | 'phone-pad'; secure?: boolean; multiline?: boolean; maxLength?: number } = {}) => (
    <View style={styles.fieldBlock} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, options.multiline && styles.multiline]}
        value={String(form[key])}
        onChangeText={(value) => set(key, key === 'age' ? Number(value.replace(/[^0-9]/g, '').slice(0, 3)) : value)}
        placeholder={placeholder}
        placeholderTextColor="#718199"
        keyboardType={options.keyboard === 'numeric' ? 'number-pad' : options.keyboard === 'phone-pad' ? 'phone-pad' : 'default'}
        secureTextEntry={options.secure && !showPasswords}
        autoCapitalize={key === 'username' ? 'none' : 'words'}
        autoCorrect={false}
        multiline={options.multiline}
        maxLength={options.maxLength}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>← BACK TO DASHBOARD</Text></Pressable>
          <Text style={styles.eyebrow}>LEADERSHIP PORTAL</Text>
          <Text style={styles.title}>CREATE OFFICER ACCOUNT</Text>
          <Text style={styles.subtitle}>Prepare the Officer's login credentials and member information.</Text>

          <View style={styles.approvalNotice}>
            <Text style={styles.noticeTitle}>{isPresident ? 'PRESIDENT ACCOUNT CREATION' : 'PRESIDENT APPROVAL REQUIRED'}</Text>
            <Text style={styles.noticeCopy}>
              {isPresident
                ? 'As President, Officer accounts you create will be activated immediately.'
                : 'As Vice President, you can submit an Officer account request. The account stays pending and cannot log in until the President approves it.'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>OFFICER ASSIGNMENT</Text>
            <Text style={styles.helpCopy}>Choose the specific Officer area this account is allowed to manage.</Text>
            <View style={styles.positionGrid}>
              {([
                ['moderator', 'Moderator'],
                ['secretary', 'Secretary'],
                ['treasurer', 'Treasurer'],
                ['auditor', 'Auditor'],
                ['editor_media', 'Editor & Media'],
              ] as [OfficerPosition, string][]).map(([value, label]) => (
                <Pressable key={value} onPress={() => set('officer_position', value)} style={[styles.positionChip, form.officer_position === value && styles.positionChipActive]}>
                  <Text style={[styles.positionChipText, form.officer_position === value && styles.positionChipTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.cardTitle, { marginTop: 22 }]}>ACCOUNT DETAILS</Text>
            {field('USERNAME', 'username', 'Enter username', { maxLength: 24 })}
            {field('FULL NAME', 'full_name', 'Enter full name', { maxLength: 100 })}
            {field('NAME OF UNIT', 'unit_name', 'Enter unit name', { maxLength: 100 })}
            {field('UNIT', 'unit', 'Enter unit / chapter', { maxLength: 100 })}
            {field('AGE', 'age', 'Enter age', { keyboard: 'numeric', maxLength: 3 })}
            {field('ADDRESS', 'address', 'Enter complete address', { multiline: true, maxLength: 300 })}

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>GENDER</Text>
              <View style={styles.genderWrap}>
                {['Male', 'Female', 'Other', 'Prefer not to say'].map((item) => (
                  <Pressable key={item} onPress={() => set('gender', item)} style={[styles.genderChip, form.gender === item && styles.genderChipActive]}>
                    <Text style={[styles.genderText, form.gender === item && styles.genderTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {field('CONTACT NUMBER', 'contact_number', 'Enter contact number', { keyboard: 'phone-pad', maxLength: 24 })}
            <Text style={[styles.cardTitle, styles.passwordHeading]}>LOGIN CREDENTIALS</Text>
            {field('PASSWORD', 'password', 'Create temporary password', { secure: true, maxLength: 72 })}
            {field('CONFIRM PASSWORD', 'confirm_password', 'Re-enter password', { secure: true, maxLength: 72 })}
            <Pressable onPress={() => setShowPasswords((value) => !value)} style={styles.showPassword}>
              <Text style={styles.showPasswordText}>{showPasswords ? 'HIDE PASSWORDS' : 'SHOW PASSWORDS'}</Text>
            </Pressable>

            <View style={styles.roleNote}>
              <Text style={styles.roleNoteTitle}>ACCOUNT TYPE</Text>
              <Text style={styles.roleNoteValue}>{form.officer_position === 'editor_media' ? 'EDITOR & MEDIA' : form.officer_position ? form.officer_position.toUpperCase() : 'NOT SELECTED'}</Text>
              <Text style={styles.roleNoteCopy}>
                {isPresident ? 'This account will be created as an active Officer.' : 'This account will be created as a pending Officer request for President review.'}
              </Text>
            </View>

            <Pressable onPress={submit} disabled={saving} style={[styles.submit, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color="#061326" /> : <Text style={styles.submitText}>{isPresident ? 'CREATE OFFICER ACCOUNT' : 'SUBMIT FOR PRESIDENT APPROVAL'}</Text>}
            </Pressable>
          </View>
          <Text style={styles.footer}>KRIANSTYLE LEADERSHIP • OFFICER ACCOUNT SETUP</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Loading() { return <SafeAreaView style={[styles.safe, styles.loading]}><ActivityIndicator color={C.blue} /><Text style={styles.subtitle}>Checking leadership access...</Text></SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, flex: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 19, paddingTop: 13, paddingBottom: 35 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 15 }, backText: { color: C.pale, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: C.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1.8, marginTop: 12 },
  title: { color: C.white, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  subtitle: { color: C.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  approvalNotice: { borderWidth: 1, borderColor: '#315F9B', backgroundColor: '#10223D', borderRadius: 12, padding: 13, marginTop: 18 },
  noticeTitle: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, noticeCopy: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 16, marginTop: 16 },
  cardTitle: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  helpCopy: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 7 },
  positionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  positionChip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.field, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10 },
  positionChipActive: { borderColor: C.blue, backgroundColor: '#17375F' },
  positionChipText: { color: C.muted, fontSize: 9, fontWeight: '800' },
  positionChipTextActive: { color: C.pale },
  fieldBlock: { marginTop: 14 }, label: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, marginBottom: 7 },
  input: { minHeight: 47, borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.field, color: C.white, paddingHorizontal: 12, fontSize: 12 },
  multiline: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  genderWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  genderChip: { borderWidth: 1, borderColor: C.line, borderRadius: 25, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: C.field },
  genderChipActive: { backgroundColor: '#17375F', borderColor: C.blue }, genderText: { color: C.muted, fontSize: 9, fontWeight: '700' }, genderTextActive: { color: C.pale },
  passwordHeading: { marginTop: 25 }, showPassword: { alignSelf: 'flex-end', paddingVertical: 11 }, showPasswordText: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  roleNote: { borderWidth: 1, borderColor: '#315F9B', backgroundColor: '#10223D', borderRadius: 11, padding: 12, marginTop: 11 },
  roleNoteTitle: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 }, roleNoteValue: { color: C.green, fontSize: 12, fontWeight: '900', marginTop: 5 },
  roleNoteCopy: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 5 },
  submit: { minHeight: 49, borderRadius: 11, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18, paddingHorizontal: 8 },
  submitText: { color: '#061326', fontSize: 9, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center' }, disabled: { opacity: 0.65 },
  footer: { color: '#66758B', fontSize: 7, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 24 },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
