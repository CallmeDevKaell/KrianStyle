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
import { supabase } from '../../lib/supabase';
import { useOfficerGuard, type OfficerPosition } from '../../lib/useOfficerGuard';

const C = {
  bg: '#090D16', card: '#121C2B', field: '#17243A', blue: '#3185FF', pale: '#8DBBFF',
  white: '#F7FAFF', muted: '#9AA9BE', line: '#293A52', green: '#4DD6A0', amber: '#FFC76A',
};

const MODULES: { key: OfficerPosition; title: string; subtitle: string; number: string; ready: boolean }[] = [
  { key: 'moderator', title: 'MODERATOR', subtitle: 'Community moderation and member coordination.', number: '01', ready: false },
  { key: 'secretary', title: 'SECRETARY', subtitle: 'Eyeball and meeting attendance records.', number: '02', ready: true },
  { key: 'treasurer', title: 'TREASURER', subtitle: 'Financial records and collection monitoring.', number: '03', ready: false },
  { key: 'auditor', title: 'AUDITOR', subtitle: 'Review and audit community records.', number: '04', ready: false },
  { key: 'editor_media', title: 'EDITOR & MEDIA', subtitle: 'Community announcements, photos, and media.', number: '05', ready: false },
];

export default function OfficerDashboard() {
  const router = useRouter();
  const { profile, checking } = useOfficerGuard();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  }, []);

  const logout = () => {
    Alert.alert('Log out', 'Are you sure you want to end your Officer session?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); router.replace('/'); } },
    ]);
  };

  if (checking || !profile) return <Loading />;
  const assigned = MODULES.find((item) => item.key === profile.officer_position);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.blue} />}
      >
        <View style={styles.header}>
          <View style={styles.brand}><Text style={styles.brandText}>KS</Text></View>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>KRIANSTYLE PHILIPPINES</Text>
            <Text style={styles.title}>OFFICER DASHBOARD</Text>
            <Text style={styles.subtitle}>Welcome, {profile.full_name}.</Text>
          </View>
          <Pressable onPress={logout} style={styles.logout}><Text style={styles.logoutText}>LOG OUT</Text></Pressable>
        </View>

        <View style={styles.assignmentCard}>
          <Text style={styles.assignmentEyebrow}>YOUR OFFICIAL ASSIGNMENT</Text>
          <Text style={styles.assignmentTitle}>{assigned?.title ?? 'OFFICER'}</Text>
          <Text style={styles.assignmentCopy}>
            Your account can manage only the module assigned to your position. Other Officer areas remain visible for reference but are read-only.
          </Text>
          <View style={styles.assignmentBadge}><Text style={styles.assignmentBadgeText}>POSITION-BASED ACCESS ENABLED</Text></View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>OFFICER MODULES</Text>
          <Text style={styles.sectionCaption}>YOUR ACCESS AND OTHER DEPARTMENTS</Text>
        </View>

        {MODULES.map((item) => {
          const isMine = item.key === profile.officer_position;
          const isAvailable = isMine && item.ready;
          const status = isAvailable ? 'ACTIVE' : 'PENDING';
          return (
            <View key={item.key} style={[styles.moduleCard, isAvailable && styles.moduleCardActive]}>
              <View style={styles.moduleTop}>
                <Text style={styles.moduleNumber}>{item.number}</Text>
                <View style={[styles.statusPill, isAvailable ? styles.statusActive : styles.statusPending]}>
                  <Text style={[styles.statusText, { color: isAvailable ? C.green : isMine ? C.amber : C.pale }]}>{status}</Text>
                </View>
              </View>
              <Text style={styles.moduleTitle}>{item.title}</Text>
              <Text style={styles.moduleCopy}>{item.subtitle}</Text>
              {isAvailable ? (
                <Pressable style={styles.openButton} onPress={() => router.push('/officer/secretary')}>
                  <Text style={styles.openButtonText}>OPEN SECRETARY MODULE</Text>
                  <Text style={styles.arrow}>›</Text>
                </Pressable>
              ) : (
                <View style={styles.readonlyRow}>
                  <Text style={styles.readonlyIcon}>◉</Text>
                  <Text style={styles.readonlyText}>{isMine ? 'This module is being prepared.' : 'Visible for reference only. No access to actions.'}</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.permissionNote}>
          <Text style={styles.permissionTitle}>OFFICER ACCESS RULE</Text>
          <Text style={styles.permissionCopy}>Only the assigned Officer position can open its working module. The Secretary can manage attendance only; Moderator, Treasurer, Auditor, and Editor & Media controls are not available to a Secretary account.</Text>
        </View>
        <Text style={styles.footer}>KRIANSTYLE OFFICER PORTAL • BROTHERHOOD • RESPECT • PASSION</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Loading() {
  return <SafeAreaView style={[styles.safe, styles.loading]}><ActivityIndicator color={C.blue} size="large" /><Text style={styles.subtitle}>Verifying Officer access...</Text></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  content: { width: '100%', maxWidth: 650, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  brand: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#10284B', borderWidth: 1, borderColor: '#315F9B', alignItems: 'center', justifyContent: 'center' },
  brandText: { color: C.blue, fontSize: 16, fontWeight: '900' }, headerCopy: { flex: 1 },
  eyebrow: { color: C.pale, fontSize: 7, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: C.white, fontSize: 15, fontWeight: '900', letterSpacing: 0.4, marginTop: 4 },
  subtitle: { color: C.muted, fontSize: 10, marginTop: 4 },
  logout: { borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingHorizontal: 9, paddingVertical: 8 },
  logoutText: { color: C.pale, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  assignmentCard: { borderWidth: 1, borderColor: '#315F9B', backgroundColor: '#10223D', borderRadius: 16, padding: 17, marginBottom: 24 },
  assignmentEyebrow: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  assignmentTitle: { color: C.white, fontSize: 23, fontWeight: '900', marginTop: 10 },
  assignmentCopy: { color: C.muted, fontSize: 10, lineHeight: 16, marginTop: 7 },
  assignmentBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#315F9B', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, marginTop: 13 },
  assignmentBadgeText: { color: C.pale, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  sectionHeader: { marginBottom: 12 }, sectionTitle: { color: C.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.3 },
  sectionCaption: { color: C.muted, fontSize: 7, fontWeight: '800', letterSpacing: 0.9, marginTop: 4 },
  moduleCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, marginBottom: 10 },
  moduleCardActive: { borderColor: '#315F9B', backgroundColor: '#101E31' },
  moduleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moduleNumber: { color: C.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  statusPill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  statusActive: { borderColor: '#276B56', backgroundColor: '#102B25' },
  statusPending: { borderColor: '#80633A', backgroundColor: '#2A2117' },
  statusReadonly: { borderColor: '#315F9B', backgroundColor: '#10223D' },
  statusText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.6 },
  moduleTitle: { color: C.white, fontSize: 13, fontWeight: '900', letterSpacing: 0.6, marginTop: 12 },
  moduleCopy: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 5 },
  openButton: { minHeight: 42, borderRadius: 10, backgroundColor: C.blue, paddingHorizontal: 12, marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  openButtonText: { color: '#071528', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, arrow: { color: '#071528', fontSize: 21, lineHeight: 22 },
  readonlyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: C.line, marginTop: 12, paddingTop: 10 },
  readonlyIcon: { color: C.pale, fontSize: 12 }, readonlyText: { color: C.muted, fontSize: 8, lineHeight: 14, flex: 1 },
  permissionNote: { borderWidth: 1, borderColor: C.line, backgroundColor: '#101923', borderRadius: 12, padding: 13, marginTop: 11 },
  permissionTitle: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  permissionCopy: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 6 },
  footer: { color: '#64758D', fontSize: 7, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center', marginTop: 22 },
  loading: { alignItems: 'center', justifyContent: 'center' },
});
