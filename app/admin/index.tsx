import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getAdminAccounts } from '../../lib/adminApi';
import type { AdminAccount } from '../../lib/adminApi';
import { supabase } from '../../lib/supabase';
import { useAdminGuard } from '../../lib/useAdminGuard';

const C = {
  bg: '#090D16', card: '#121C2B', card2: '#17243A', blue: '#3185FF',
  blueLight: '#8DBBFF', white: '#F7FAFF', muted: '#9AA9BE', line: '#293A52',
  green: '#4DD6A0', amber: '#FFC76A',
};

export default function AdminDashboard() {
  const router = useRouter();
  const { profile, checking } = useAdminGuard();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await getAdminAccounts();
      setAccounts(rows);
    } catch (error) {
      Alert.alert('Unable to load dashboard', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) void load();
  }, [profile, load]);

  const logout = () => {
    Alert.alert('Log out', 'Are you sure you want to end your admin session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  const leaders = accounts.filter((item) => item.role === 'president_vp').length;
  const officers = accounts.filter((item) => item.role === 'officer').length;
  const members = accounts.filter((item) => item.role === 'member').length;

  if (checking || !profile) return <LoadingScreen />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.blue} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <View style={styles.header}>
          <View style={styles.brandMark}><Text style={styles.brandText}>KS</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>KRIANSTYLE PHILIPPINES</Text>
            <Text style={styles.title}>ADMIN DASHBOARD</Text>
            <Text style={styles.subtitle}>Welcome back, {profile.full_name}.</Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutButton}><Text style={styles.logoutText}>LOG OUT</Text></Pressable>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>OVERVIEW</Text>
          <Text style={styles.sectionCaption}>COMMUNITY ACCOUNTS</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}><ActivityIndicator color={C.blue} /><Text style={styles.mutedText}>Loading account statistics...</Text></View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label="TOTAL ACCOUNTS" value={accounts.length} accent={C.white} />
            <StatCard label="PRESIDENT / VP" value={leaders} accent={C.blueLight} />
            <StatCard label="OFFICERS" value={officers} accent={C.green} />
            <StatCard label="MEMBERS" value={members} accent={C.amber} />
          </View>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>ADMIN TOOLS</Text>
          <Text style={styles.sectionCaption}>MANAGE YOUR COMMUNITY</Text>
        </View>

        <ToolCard
          number="01"
          title="CREATE PRESIDENT / VP ACCOUNT"
          description="Create leadership credentials and assign the correct President or Vice President access."
          action="CREATE LEADERSHIP ACCOUNT"
          onPress={() => router.push('/admin/create-leadership')}
        />
        <ToolCard
          number="02"
          title="ACCOUNT MANAGEMENT"
          description="View registered accounts, search members, and update non-admin account roles."
          action="MANAGE ACCOUNTS"
          onPress={() => router.push('/admin/accounts')}
        />

        <View style={styles.securityNote}>
          <Text style={styles.securityTitle}>SECURITY NOTICE</Text>
          <Text style={styles.securityCopy}>Only authorized Admin accounts can access these tools. President/VP and Officer roles are assigned by the administrator, not through public registration.</Text>
        </View>
        <Text style={styles.footer}>KRIANSTYLE ADMIN • BROTHERHOOD • RESPECT • PASSION</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ToolCard({ number, title, description, action, onPress }: {
  number: string; title: string; description: string; action: string; onPress: () => void;
}) {
  return (
    <View style={styles.toolCard}>
      <View style={styles.toolTop}>
        <Text style={styles.toolNumber}>{number}</Text>
        <View style={styles.toolDot} />
      </View>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolDescription}>{description}</Text>
      <Pressable onPress={onPress} style={styles.toolButton}>
        <Text style={styles.toolButtonText}>{action}</Text>
        <Text style={styles.arrow}>›</Text>
      </Pressable>
    </View>
  );
}

function LoadingScreen() {
  return <SafeAreaView style={[styles.safe, styles.loadingScreen]}><ActivityIndicator color={C.blue} size="large" /><Text style={styles.mutedText}>Verifying administrator access...</Text></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 19, paddingTop: 18, paddingBottom: 35 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 30 },
  brandMark: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#10284B', borderWidth: 1, borderColor: '#315F9B', alignItems: 'center', justifyContent: 'center' },
  brandText: { color: C.blue, fontSize: 17, fontWeight: '900' },
  headerCopy: { flex: 1 },
  eyebrow: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: C.white, fontSize: 18, fontWeight: '900', letterSpacing: 0.4, marginTop: 4 },
  subtitle: { color: C.muted, fontSize: 10, marginTop: 4 },
  logoutButton: { borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 },
  logoutText: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  sectionHeading: { marginBottom: 12, marginTop: 3 },
  sectionTitle: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  sectionCaption: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 28 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 100, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 15, justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '900' },
  statLabel: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 7 },
  loadingCard: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, marginBottom: 28 },
  mutedText: { color: C.muted, fontSize: 11, marginTop: 9 },
  toolCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 17, marginBottom: 12 },
  toolTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolNumber: { color: C.blue, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  toolDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: C.blue },
  toolTitle: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginTop: 14 },
  toolDescription: { color: C.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  toolButton: { minHeight: 43, borderRadius: 10, backgroundColor: '#17375F', borderWidth: 1, borderColor: '#315F9B', marginTop: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolButtonText: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  arrow: { color: C.blueLight, fontSize: 22, lineHeight: 24 },
  securityNote: { backgroundColor: '#101C2C', borderWidth: 1, borderColor: '#253B57', borderRadius: 13, padding: 14, marginTop: 14 },
  securityTitle: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  securityCopy: { color: C.muted, fontSize: 10, lineHeight: 17, marginTop: 6 },
  footer: { color: '#66758B', fontSize: 7, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 25 },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
});
