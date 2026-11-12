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
import { supabase, usernameToAuthEmail } from '../lib/supabase';

const C = {
  bg: '#090D16',
  card: '#121C2B',
  card2: '#17243A',
  blue: '#3185FF',
  blueLight: '#8DBBFF',
  white: '#F7FAFF',
  muted: '#9AA9BE',
  line: '#293A52',
};

const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;
type Gender = (typeof genderOptions)[number] | '';
type FormState = {
  username: string;
  full_name: string;
  unit_name: string;
  unit: string;
  age: string;
  address: string;
  gender: Gender;
  contact_number: string;
  password: string;
  confirm_password: string;
};

const initialForm: FormState = {
  username: '', full_name: '', unit_name: '', unit: '', age: '',
  address: '', gender: '', contact_number: '', password: '', confirm_password: '',
};

export default function RegisterScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleRegister = async () => {
    const username = form.username.trim().toLowerCase();
    const contactNumber = form.contact_number.trim();
    const age = Number(form.age);

    if (!username || !form.full_name.trim() || !form.unit_name.trim() || !form.unit.trim() ||
        !form.age.trim() || !form.address.trim() || !form.gender || !contactNumber ||
        !form.password || !form.confirm_password) {
      Alert.alert('Incomplete form', 'Please fill in all fields, including password and confirmation.');
      return;
    }
    if (!/^[a-z0-9._]{3,24}$/.test(username)) {
      Alert.alert('Invalid username', 'Use 3–24 characters: lowercase letters, numbers, dots, or underscores.');
      return;
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      Alert.alert('Invalid age', 'Please enter a valid age.');
      return;
    }
    if (!/^\+?[0-9][0-9\s()-]{6,18}$/.test(contactNumber)) {
      Alert.alert('Invalid contact number', 'Please enter a valid contact number.');
      return;
    }
    if (form.password.length < 8 || form.password.length > 72 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      Alert.alert('Weak password', 'Use 8–72 characters with at least one letter and one number.');
      return;
    }
    if (form.password !== form.confirm_password) {
      Alert.alert('Password mismatch', 'Your password and confirmation do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: registrationError } = await supabase.functions.invoke('register-member', {
        body: {
          username,
          full_name: form.full_name.trim(),
          unit_name: form.unit_name.trim(),
          unit: form.unit.trim(),
          age,
          address: form.address.trim(),
          gender: form.gender,
          contact_number: contactNumber,
          password: form.password,
        },
      });

      if (registrationError) {
        let message = registrationError.message || 'Unable to create your account.';
        const response = (registrationError as unknown as { context?: Response }).context;
        if (response) {
          try {
            const payload = await response.clone().json();
            if (typeof payload?.error === 'string') message = payload.error;
          } catch {
            // Keep the SDK error message when the response body is not JSON.
          }
        }
        throw new Error(message);
      }

      // The server pre-confirms the internal Auth identity; the member can now sign in.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: usernameToAuthEmail(username),
        password: form.password,
      });
      if (signInError) {
        Alert.alert('Account created', 'Your account is registered. Please log in using your username and password.');
        router.replace('/login');
        return;
      }

      Alert.alert('Registration successful', 'Your KrianStyle member account is ready.');
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to register. Please try again.';
      Alert.alert('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key: keyof FormState,
    placeholder: string,
    options: {
      keyboardType?: 'default' | 'numeric' | 'phone-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words';
      multiline?: boolean;
      secureTextEntry?: boolean;
      maxLength?: number;
    } = {},
  ) => (
    <View style={styles.fieldBlock} key={key}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, options.multiline && styles.multilineInput]}
        placeholder={placeholder}
        placeholderTextColor="#718199"
        value={String(form[key])}
        onChangeText={(value) => update(key, value)}
        keyboardType={options.keyboardType ?? 'default'}
        autoCapitalize={options.autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        multiline={options.multiline}
        secureTextEntry={options.secureTextEntry}
        maxLength={options.maxLength}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>KS</Text></View>
          <Text style={styles.eyebrow}>KRIANSTYLE PHILIPPINES</Text>
          <Text style={styles.title}>JOIN THE BROTHERHOOD.</Text>
          <Text style={styles.subtitle}>Create your KrianStyle member account.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>MEMBER REGISTRATION</Text>
            {field('USERNAME', 'username', 'Choose a username (no spaces)', { autoCapitalize: 'none', maxLength: 24 })}
            {field('FULL NAME', 'full_name', 'Enter your complete name', { maxLength: 100 })}
            {field('NAME OF UNIT', 'unit_name', 'Enter the name of your unit', { maxLength: 100 })}
            {field('UNIT', 'unit', 'Enter your unit', { maxLength: 100 })}
            {field('AGE', 'age', 'Enter your age', { keyboardType: 'numeric', autoCapitalize: 'none', maxLength: 3 })}
            {field('ADDRESS', 'address', 'House number, barangay, municipality', { multiline: true, maxLength: 300 })}

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>GENDER</Text>
              <View style={styles.genderWrap}>
                {genderOptions.map((option) => {
                  const selected = form.gender === option;
                  return (
                    <Pressable
                      key={option}
                      style={[styles.genderChip, selected && styles.genderChipActive]}
                      onPress={() => update('gender', option)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.genderText, selected && styles.genderTextActive]}>{option}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {field('CONTACT NUMBER', 'contact_number', 'e.g. 09XXXXXXXXX or +639XXXXXXXXX', { keyboardType: 'phone-pad', autoCapitalize: 'none', maxLength: 24 })}
            {field('PASSWORD', 'password', 'At least 8 characters and one number', { autoCapitalize: 'none', secureTextEntry: !showPassword, maxLength: 72 })}
            {field('CONFIRM PASSWORD', 'confirm_password', 'Re-enter your password', { autoCapitalize: 'none', secureTextEntry: !showPassword, maxLength: 72 })}

            <Pressable onPress={() => setShowPassword((value) => !value)} style={styles.showPasswordButton}>
              <Text style={styles.showPasswordText}>{showPassword ? 'HIDE PASSWORDS' : 'SHOW PASSWORDS'}</Text>
            </Pressable>

            <View style={styles.roleNote}>
              <Text style={styles.roleNoteTitle}>DEFAULT ACCOUNT TYPE</Text>
              <Text style={styles.roleNoteText}>MEMBER</Text>
              <Text style={styles.roleNoteCaption}>Admin, President/VP, and Officer access can only be assigned by an authorized administrator.</Text>
            </View>

            <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#061326" /> : <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>}
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/login')}>
              <Text style={styles.linkText}> LOG IN</Text>
            </Pressable>
          </View>
          <Pressable style={styles.backLink} onPress={() => router.replace('/')}>
            <Text style={styles.backLinkText}>← BACK TO LANDING PAGE</Text>
          </Pressable>
          <Text style={styles.footer}>BROTHERHOOD • RESPECT • PASSION</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 18, paddingTop: 28, paddingBottom: 28 },
  brandMark: { width: 54, height: 54, borderRadius: 17, backgroundColor: '#10284B', borderWidth: 1, borderColor: '#356FBF', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  brandMarkText: { color: C.blue, fontSize: 20, fontWeight: '900', letterSpacing: -1 },
  eyebrow: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 2.6 },
  title: { color: C.white, fontSize: 25, lineHeight: 31, fontWeight: '900', letterSpacing: -0.7, marginTop: 8, textAlign: 'center' },
  subtitle: { color: C.muted, fontSize: 11, marginTop: 7, textAlign: 'center' },
  card: { width: '100%', maxWidth: 520, padding: 17, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, marginTop: 25 },
  cardTitle: { color: C.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.7, marginBottom: 8 },
  fieldBlock: { marginTop: 14 },
  label: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.card2, color: C.white, paddingHorizontal: 13, fontSize: 12 },
  multilineInput: { minHeight: 76, paddingTop: 12, textAlignVertical: 'top' },
  genderWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderChip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card2, borderRadius: 24, paddingHorizontal: 13, paddingVertical: 10 },
  genderChipActive: { backgroundColor: C.blue, borderColor: C.blue },
  genderText: { color: C.muted, fontSize: 10, fontWeight: '700' },
  genderTextActive: { color: '#061326', fontWeight: '900' },
  showPasswordButton: { alignSelf: 'flex-end', paddingVertical: 12, paddingHorizontal: 2 },
  showPasswordText: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  roleNote: { backgroundColor: '#10213A', borderWidth: 1, borderColor: '#315F9B', borderRadius: 11, padding: 13, marginTop: 5 },
  roleNoteTitle: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  roleNoteText: { color: C.white, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginTop: 5 },
  roleNoteCaption: { color: '#B4C5DC', fontSize: 10, lineHeight: 15, marginTop: 5 },
  primaryButton: { minHeight: 51, borderRadius: 11, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryButtonText: { color: '#061326', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  buttonDisabled: { opacity: 0.65 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  bottomText: { color: C.muted, fontSize: 10 },
  linkText: { color: C.blueLight, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  backLink: { paddingVertical: 17 },
  backLinkText: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  footer: { color: '#62748C', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, marginTop: 6 },
});
