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

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password) {
      Alert.alert('Missing details', 'Enter your username and password.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: usernameToAuthEmail(normalizedUsername),
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Unable to load your account. Please try again.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, role, position, officer_position, approval_status')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        // Auth worked, but a missing profile must not grant access to a protected dashboard.
        Alert.alert('Profile unavailable', 'Your login succeeded, but your KrianStyle profile could not be loaded. Please contact the administrator.');
        router.replace('/');
        return;
      }

      if (profile.approval_status !== 'approved') {
        await supabase.auth.signOut();
        Alert.alert(
          profile.approval_status === 'pending' ? 'Account pending approval' : 'Account not approved',
          profile.approval_status === 'pending'
            ? 'Your Officer account is waiting for the President’s approval. You can log in after it has been approved.'
            : 'This account is not approved for access. Please contact the President.',
        );
        router.replace('/login');
        return;
      }

      if (profile.role === 'admin') {
        router.replace('/admin');
        return;
      }

      if (profile.role === 'president_vp' && (profile.position === 'president' || profile.position === 'vice_president')) {
        router.replace('/leadership');
        return;
      }

      if (profile.role === 'officer' && profile.officer_position) {
        router.replace('/officer');
        return;
      }

      Alert.alert('Welcome to KrianStyle', `Hello, ${profile.full_name}!\nAccount type: ${profile.role.replace('_', ' ').toUpperCase()}`);
      router.replace('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log in. Please try again.';
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>KS</Text></View>
          <Text style={styles.eyebrow}>KRIANSTYLE PHILIPPINES</Text>
          <Text style={styles.title}>WELCOME BACK.</Text>
          <Text style={styles.subtitle}>Sign in and ride with your community.</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>ACCOUNT LOGIN</Text>
            <Text style={styles.label}>USERNAME</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              placeholderTextColor="#718199"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              returnKeyType="next"
            />

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor="#718199"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                <Text style={styles.showText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
              </Pressable>
            </View>

            <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#061326" /> : <Text style={styles.primaryButtonText}>LOG IN</Text>}
            </Pressable>
          </View>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>New to KrianStyle?</Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.linkText}> CREATE ACCOUNT</Text>
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
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 34, paddingBottom: 28 },
  brandMark: { width: 58, height: 58, borderRadius: 18, backgroundColor: '#10284B', borderWidth: 1, borderColor: '#356FBF', alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  brandMarkText: { color: C.blue, fontSize: 21, fontWeight: '900', letterSpacing: -1 },
  eyebrow: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 2.8 },
  title: { color: C.white, fontSize: 31, fontWeight: '900', letterSpacing: -1, marginTop: 8, textAlign: 'center' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 8, textAlign: 'center' },
  card: { width: '100%', maxWidth: 460, padding: 20, borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.card, marginTop: 30 },
  cardTitle: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 1.8, marginBottom: 22 },
  label: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, marginTop: 13 },
  input: { minHeight: 50, borderWidth: 1, borderColor: C.line, borderRadius: 11, backgroundColor: C.card2, color: C.white, paddingHorizontal: 14, fontSize: 13 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 58 },
  showText: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginLeft: -52, marginRight: 14 },
  primaryButton: { minHeight: 52, borderRadius: 12, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
  primaryButtonText: { color: '#061326', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
  buttonDisabled: { opacity: 0.65 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  bottomText: { color: C.muted, fontSize: 11 },
  linkText: { color: C.blueLight, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  backLink: { paddingVertical: 18 },
  backLinkText: { color: C.muted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  footer: { color: '#62748C', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, marginTop: 'auto' },
});
