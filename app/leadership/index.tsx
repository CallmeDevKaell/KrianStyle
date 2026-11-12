import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getLeadershipAccounts, type LeadershipAccount } from '../../lib/leadershipApi';
import { supabase } from '../../lib/supabase';
import { useLeadershipGuard } from '../../lib/useLeadershipGuard';

const C = {
  bg: '#090D16', card: '#121C2B', card2: '#17243A', blue: '#3185FF',
  blueLight: '#8DBBFF', white: '#F7FAFF', muted: '#9AA9BE', line: '#293A52',
  green: '#4DD6A0', amber: '#FFC76A', red: '#FF8585',
};

export default function LeadershipDashboard() {
  const router = useRouter();
  const { profile, checking } = useLeadershipGuard();
  const [accounts, setAccounts] = useState<LeadershipAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await getLeadershipAccounts();
      setAccounts(result.accounts ?? []);
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

  const counts = useMemo(() => ({
    total: accounts.length,
    officers: accounts.filter((item) => item.role === 'officer' && item.approval_status === 'approved').length,
    members: accounts.filter((item) => item.role === 'member').length,
    pending: accounts.filter((item) => item.approval_status === 'pending').length,
  }), [accounts]);

  const logout = () => {
    Alert.alert('Log out', 'Are you sure you want to end your leadership session?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out', style: 'destructive', onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  if (checking || !profile) return <LoadingScreen />;
  const isPresident = profile.position === 'president';

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
            <Text style={styles.title}>{isPresident ? 'PRESIDENT DASHBOARD' : 'VICE PRESIDENT DASHBOARD'}</Text>
            <Text style={styles.subtitle}>Welcome back, {profile.full_name}.</Text>
          </View>
          <Pressable onPress={logout} style={styles.logoutButton}><Text style={styles.logoutText}>LOG OUT</Text></Pressable>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeTop}>
            <Text style={styles.welcomeEyebrow}>LEADERSHIP PORTAL</Text>
            <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{isPresident ? 'PRESIDENT' : 'VICE PRESIDENT'}</Text></View>
          </View>
          <Text style={styles.welcomeTitle}>{isPresident ? 'Lead with purpose.' : 'Support the team.'}</Text>
          <Text style={styles.welcomeCopy}>
            {isPresident
              ? 'Review officer account requests, approve new officers, and keep the community accounts organized.'
              : 'Create officer account requests and manage the community account directory. New officer accounts need President approval.'}
          </Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>COMMUNITY OVERVIEW</Text>
          <Text style={styles.sectionCaption}>ACCOUNT SUMMARY</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}><ActivityIndicator color={C.blue} /><Text style={styles.mutedText}>Loading account statistics...</Text></View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label="VISIBLE ACCOUNTS" value={counts.total} accent={C.white} />
            <StatCard label="ACTIVE OFFICERS" value={counts.officers} accent={C.green} />
            <StatCard label="MEMBERS" value={counts.members} accent={C.blueLight} />
            <StatCard label={isPresident ? 'PENDING APPROVALS' : 'YOUR PENDING REQUESTS'} value={counts.pending} accent={C.amber} />
          </View>
        )}

        {isPresident && counts.pending > 0 && (
          <Pressable onPress={() => router.push('/leadership/accounts?filter=pending')} style={styles.pendingBanner}>
            <View style={styles.pendingIcon}><Text style={styles.pendingIconText}>!</Text></View>
            <View style={styles.pendingCopyWrap}>
              <Text style={styles.pendingTitle}>{counts.pending} OFFICER REQUEST{counts.pending === 1 ? '' : 'S'} NEED REVIEW</Text>
              <Text style={styles.pendingCopy}>Review and approve or reject the submitted account requests.</Text>
            </View>
            <Text style={styles.pendingArrow}>›</Text>
          </Pressable>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>LEADERSHIP TOOLS</Text>
          <Text style={styles.sectionCaption}>MANAGE YOUR COMMUNITY</Text>
        </View>

        <ToolCard
          number="01"
          title="CREATE OFFICER ACCOUNT"
          description={isPresident
            ? 'Create an Officer account. Accounts created by the President become active immediately.'
            : 'Submit a new Officer account request. The account becomes active only after the President approves it.'}
          action="CREATE OFFICER ACCOUNT"
          onPress={() => router.push('/leadership/create-officer')}
        />
        <ToolCard
          number="02"
          title="ACCOUNT MANAGEMENT"
          description={isPresident
            ? 'View accounts, review pending Officer requests, and manage Member or Officer roles.'
            : 'View the community account directory and check the status of your Officer requests.'}
          action="MANAGE ACCOUNTS"
          onPress={() => router.push('/leadership/accounts')}
        />

        <View style={styles.securityNote}>
          <Text style={styles.securityTitle}>APPROVAL WORKFLOW</Text>
          <Text style={styles.securityCopy}>
            Officer accounts created by the Vice President remain pending until the President approves them. Pending and rejected accounts cannot access the Officer area.
          </Text>
        </View>
        <Text style={styles.footer}>KRIANSTYLE LEADERSHIP • BROTHERHOOD • RESPECT • PASSION</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return <View style={styles.statCard}><Text style={[styles.statValue, { color: accent }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function ToolCard({ number, title, description, action, onPress }: {
  number: string; title: string; description: string; action: string; onPress: () => void;
}) {
  return (
    <View style={styles.toolCard}>
      <View style={styles.toolTop}><Text style={styles.toolNumber}>{number}</Text><View style={styles.toolDot} /></View>
      <Text style={styles.toolTitle}>{title}</Text>
      <Text style={styles.toolDescription}>{description}</Text>
      <Pressable onPress={onPress} style={styles.toolButton}><Text style={styles.toolButtonText}>{action}</Text><Text style={styles.arrow}>›</Text></Pressable>
    </View>
  );
}

function LoadingScreen() {
  return <SafeAreaView style={[styles.safe, styles.loadingScreen]}><ActivityIndicator color={C.blue} size="large" /><Text style={styles.mutedText}>Verifying leadership access...</Text></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 19, paddingTop: 18, paddingBottom: 35 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 19 },
  brandMark: { width: 48, height: 48, borderRadius: 15, backgroundColor: '#10284B', borderWidth: 1, borderColor: '#315F9B', alignItems: 'center', justifyContent: 'center' },
  brandText: { color: C.blue, fontSize: 17, fontWeight: '900' }, headerCopy: { flex: 1 },
  eyebrow: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: C.white, fontSize: 15, fontWeight: '900', letterSpacing: 0.3, marginTop: 4 },
  subtitle: { color: C.muted, fontSize: 10, marginTop: 4 },
  logoutButton: { borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9 },
  logoutText: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  welcomeCard: { borderRadius: 17, padding: 17, backgroundColor: '#10223D', borderWidth: 1, borderColor: '#315F9B', marginBottom: 26 },
  welcomeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  welcomeEyebrow: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1.6 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#17375F' },
  roleBadgeText: { color: C.blueLight, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  welcomeTitle: { color: C.white, fontSize: 22, fontWeight: '900', marginTop: 17, letterSpacing: -0.5 },
  welcomeCopy: { color: C.muted, fontSize: 10, lineHeight: 17, marginTop: 7 },
  sectionHeading: { marginBottom: 12, marginTop: 3 },
  sectionTitle: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  sectionCaption: { color: C.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  statCard: { width: '48%', flexGrow: 1, minHeight: 95, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 15, padding: 15, justifyContent: 'center' },
  statValue: { fontSize: 27, fontWeight: '900' }, statLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 7 },
  loadingCard: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, marginBottom: 25 },
  mutedText: { color: C.muted, fontSize: 11, marginTop: 9 },
  pendingBanner: { minHeight: 75, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 13, borderWidth: 1, borderColor: '#8A6635', backgroundColor: '#2A2117', padding: 12, marginTop: -10, marginBottom: 24 },
  pendingIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' },
  pendingIconText: { color: '#211506', fontSize: 16, fontWeight: '900' }, pendingCopyWrap: { flex: 1 },
  pendingTitle: { color: C.amber, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }, pendingCopy: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 4 }, pendingArrow: { color: C.amber, fontSize: 24 },
  toolCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 17, marginBottom: 12 },
  toolTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolNumber: { color: C.blue, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, toolDot: { width: 7, height: 7, borderRadius: 5, backgroundColor: C.blue },
  toolTitle: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginTop: 14 },
  toolDescription: { color: C.muted, fontSize: 10, lineHeight: 17, marginTop: 7 },
  toolButton: { minHeight: 43, borderRadius: 10, backgroundColor: '#17375F', borderWidth: 1, borderColor: '#315F9B', marginTop: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolButtonText: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, arrow: { color: C.blueLight, fontSize: 22, lineHeight: 24 },
  securityNote: { backgroundColor: '#101C2C', borderWidth: 1, borderColor: '#253B57', borderRadius: 13, padding: 14, marginTop: 14 },
  securityTitle: { color: C.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  securityCopy: { color: C.muted, fontSize: 9, lineHeight: 16, marginTop: 6 },
  footer: { color: '#66758B', fontSize: 7, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 25 },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
});
