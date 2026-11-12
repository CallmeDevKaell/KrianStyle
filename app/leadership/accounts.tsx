import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getLeadershipAccounts,
  reviewOfficerAccount,
  updateLeadershipManagedRole,
  type LeadershipAccount,
  type OfficerPosition,
} from '../../lib/leadershipApi';
import { useLeadershipGuard } from '../../lib/useLeadershipGuard';

const C = { bg: '#090D16', card: '#121C2B', field: '#17243A', blue: '#3185FF', pale: '#8DBBFF', white: '#F7FAFF', muted: '#9AA9BE', line: '#293A52', green: '#4DD6A0', amber: '#FFC76A', red: '#FF8585' };
type Filter = 'all' | 'pending' | 'officer' | 'member' | 'rejected';

export default function LeadershipAccountsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { profile, checking } = useLeadershipGuard();
  const [accounts, setAccounts] = useState<LeadershipAccount[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(params.filter === 'pending' ? 'pending' : 'all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<LeadershipAccount | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getLeadershipAccounts();
      setAccounts(result.accounts ?? []);
    } catch (error) {
      Alert.alert('Unable to load accounts', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (profile) void load();
  }, [profile, load]);

  const isPresident = profile?.position === 'president';
  const visibleAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((item) => {
      const matchesSearch = !term || [item.username, item.full_name, item.unit_name, item.unit, item.contact_number, item.officer_position ?? ''].some((value) => value.toLowerCase().includes(term));
      const matchesFilter = filter === 'all'
        || (filter === 'pending' && item.approval_status === 'pending')
        || (filter === 'rejected' && item.approval_status === 'rejected')
        || (filter === 'officer' && item.role === 'officer')
        || (filter === 'member' && item.role === 'member');
      return matchesSearch && matchesFilter;
    });
  }, [accounts, search, filter]);

  const review = (account: LeadershipAccount, decision: 'approve' | 'reject') => {
    const verb = decision === 'approve' ? 'approve' : 'reject';
    Alert.alert(
      `${decision === 'approve' ? 'Approve' : 'Reject'} officer request?`,
      `Are you sure you want to ${verb} ${account.full_name}'s Officer account request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: decision === 'approve' ? 'Approve' : 'Reject',
          style: decision === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setWorkingId(account.user_id);
            try {
              const result = await reviewOfficerAccount(account.user_id, decision);
              Alert.alert('Request updated', result.message);
              await load();
            } catch (error) {
              Alert.alert('Unable to update request', error instanceof Error ? error.message : 'Please try again.');
            } finally {
              setWorkingId(null);
            }
          },
        },
      ],
    );
  };

  const applyRoleChange = async (account: LeadershipAccount, nextRole: 'member' | 'officer', officerPosition?: OfficerPosition) => {
    setWorkingId(account.user_id);
    try {
      const result = await updateLeadershipManagedRole(account.user_id, nextRole, officerPosition);
      Alert.alert('Account updated', result.message);
      await load();
    } catch (error) {
      Alert.alert('Unable to update account', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setWorkingId(null);
    }
  };

  const changeRole = (account: LeadershipAccount) => {
    if (!isPresident) return;
    if (account.role === 'officer') {
      Alert.alert(
        'Change account role?',
        `Set ${account.full_name}'s account back to MEMBER?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Change to Member', style: 'destructive', onPress: () => void applyRoleChange(account, 'member') },
        ],
      );
      return;
    }

    setAssignmentTarget(account);
  };

  if (checking || !profile) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.blue} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <Pressable style={styles.back} onPress={() => router.replace('/leadership')}><Text style={styles.backText}>← BACK TO DASHBOARD</Text></Pressable>
        <Text style={styles.eyebrow}>LEADERSHIP PORTAL</Text>
        <Text style={styles.title}>ACCOUNT MANAGEMENT</Text>
        <Text style={styles.subtitle}>{isPresident ? 'Review officer requests and manage Member or Officer account roles.' : 'View community accounts and track the status of your Officer requests.'}</Text>

        <View style={styles.summaryRow}>
          <Summary value={accounts.length} label="ACCOUNTS" />
          <Summary value={accounts.filter((item) => item.approval_status === 'pending').length} label="PENDING" accent={C.amber} />
          <Summary value={accounts.filter((item) => item.role === 'officer' && item.approval_status === 'approved').length} label="OFFICERS" accent={C.green} />
        </View>

        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search name, username, or unit..."
          placeholderTextColor="#718199"
          autoCapitalize="none"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterButton label="ALL" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterButton label="PENDING" active={filter === 'pending'} onPress={() => setFilter('pending')} />
          <FilterButton label="OFFICERS" active={filter === 'officer'} onPress={() => setFilter('officer')} />
          <FilterButton label="MEMBERS" active={filter === 'member'} onPress={() => setFilter('member')} />
          <FilterButton label="REJECTED" active={filter === 'rejected'} onPress={() => setFilter('rejected')} />
        </ScrollView>

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>REGISTERED ACCOUNTS</Text>
          <Text style={styles.countText}>{visibleAccounts.length} SHOWN</Text>
        </View>

        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={C.blue} /><Text style={styles.emptyText}>Loading accounts...</Text></View>
        ) : visibleAccounts.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>NO ACCOUNTS FOUND</Text><Text style={styles.emptyText}>Try another search or filter.</Text></View>
        ) : visibleAccounts.map((account) => (
          <View style={styles.accountCard} key={account.user_id}>
            <View style={styles.accountTop}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{account.full_name.trim().charAt(0).toUpperCase() || '?'}</Text></View>
              <View style={styles.accountIdentity}>
                <Text style={styles.name}>{account.full_name}</Text>
                <Text style={styles.username}>@{account.username}</Text>
              </View>
              <StatusPill status={account.approval_status} />
            </View>
            <View style={styles.infoGrid}>
              <Info label="ACCOUNT TYPE" value={account.role === 'president_vp' ? (account.position === 'president' ? 'President' : 'Vice President') : account.role.toUpperCase()} />
              {account.role === 'officer' ? <Info label="OFFICER ASSIGNMENT" value={account.officer_position === 'editor_media' ? 'Editor & Media' : (account.officer_position ?? 'Unassigned').replace('_', ' ')} /> : null}
              <Info label="UNIT" value={account.unit} />
              <Info label="UNIT NAME" value={account.unit_name} />
              <Info label="CONTACT" value={account.contact_number} />
            </View>
            {account.approval_status === 'pending' && (
              <View style={styles.pendingNote}>
                <Text style={styles.pendingNoteText}>WAITING FOR PRESIDENT APPROVAL</Text>
                {isPresident ? (
                  <View style={styles.reviewButtons}>
                    <Pressable disabled={workingId === account.user_id} onPress={() => review(account, 'approve')} style={[styles.approveButton, workingId === account.user_id && styles.disabled]}>
                      {workingId === account.user_id ? <ActivityIndicator color="#082014" /> : <Text style={styles.approveText}>APPROVE</Text>}
                    </Pressable>
                    <Pressable disabled={workingId === account.user_id} onPress={() => review(account, 'reject')} style={[styles.rejectButton, workingId === account.user_id && styles.disabled]}>
                      <Text style={styles.rejectText}>REJECT</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.pendingHelper}>The President must approve this account before it can be used.</Text>
                )}
              </View>
            )}
            {account.approval_status === 'rejected' && account.review_note ? (
              <View style={styles.rejectedNote}><Text style={styles.rejectedNoteText}>PRESIDENT NOTE: {account.review_note}</Text></View>
            ) : null}
            {isPresident && account.approval_status === 'approved' && (account.role === 'member' || account.role === 'officer') && (
              <Pressable disabled={workingId === account.user_id} onPress={() => changeRole(account)} style={[styles.roleButton, workingId === account.user_id && styles.disabled]}>
                <Text style={styles.roleButtonText}>{account.role === 'officer' ? 'CHANGE TO MEMBER' : 'PROMOTE TO OFFICER'}</Text>
              </Pressable>
            )}
          </View>
        ))}

        <Text style={styles.footer}>KRIANSTYLE LEADERSHIP • ACCOUNT DIRECTORY</Text>
      </ScrollView>
      <Modal visible={Boolean(assignmentTarget)} transparent animationType="fade" onRequestClose={() => setAssignmentTarget(null)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ASSIGN OFFICER POSITION</Text>
            <Text style={styles.modalCopy}>Choose the specific area for {assignmentTarget?.full_name ?? 'this account'}.</Text>
            {([
              ['moderator', 'Moderator'],
              ['secretary', 'Secretary'],
              ['treasurer', 'Treasurer'],
              ['auditor', 'Auditor'],
              ['editor_media', 'Editor & Media'],
            ] as [OfficerPosition, string][]).map(([value, label]) => (
              <Pressable key={value} disabled={Boolean(workingId)} style={styles.modalOption} onPress={() => {
                const target = assignmentTarget;
                setAssignmentTarget(null);
                if (target) void applyRoleChange(target, 'officer', value);
              }}>
                <Text style={styles.modalOptionText}>{label}</Text>
                <Text style={styles.modalArrow}>›</Text>
              </Pressable>
            ))}
            <Pressable style={styles.modalCancel} onPress={() => setAssignmentTarget(null)}><Text style={styles.modalCancelText}>CANCEL</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Summary({ value, label, accent = C.white }: { value: number; label: string; accent?: string }) {
  return <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: accent }]}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoItem}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue} numberOfLines={1}>{value || '—'}</Text></View>;
}
function FilterButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.filterButton, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}
function StatusPill({ status }: { status: string }) {
  const color = status === 'approved' ? C.green : status === 'pending' ? C.amber : C.red;
  return <View style={[styles.statusPill, { borderColor: color }]}><Text style={[styles.statusText, { color }]}>{status.toUpperCase()}</Text></View>;
}
function Loading() { return <SafeAreaView style={[styles.safe, styles.loading]}><ActivityIndicator color={C.blue} /><Text style={styles.subtitle}>Checking leadership access...</Text></SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, content: { width: '100%', maxWidth: 650, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 35 },
  back: { alignSelf: 'flex-start', paddingVertical: 10, paddingRight: 15 }, backText: { color: C.pale, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: C.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1.8, marginTop: 10 },
  title: { color: C.white, fontSize: 22, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 },
  subtitle: { color: C.muted, fontSize: 10, lineHeight: 17, marginTop: 7 },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 20 }, summaryCard: { flex: 1, minHeight: 75, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 11, justifyContent: 'center' },
  summaryValue: { fontSize: 23, fontWeight: '900' }, summaryLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 4 },
  search: { height: 47, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 11, color: C.white, paddingHorizontal: 13, fontSize: 11, marginTop: 17 },
  filters: { flexDirection: 'row', gap: 7, paddingVertical: 13 }, filterButton: { borderWidth: 1, borderColor: C.line, borderRadius: 30, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: C.card }, filterActive: { borderColor: C.blue, backgroundColor: '#17375F' },
  filterText: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }, filterTextActive: { color: C.pale },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, marginBottom: 11 }, listTitle: { color: C.white, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, countText: { color: C.muted, fontSize: 8, fontWeight: '800' },
  accountCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 13, marginBottom: 10 }, accountTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#17375F', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: C.pale, fontSize: 15, fontWeight: '900' }, accountIdentity: { flex: 1 }, name: { color: C.white, fontSize: 11, fontWeight: '900' }, username: { color: C.muted, fontSize: 9, marginTop: 3 },
  statusPill: { borderWidth: 1, borderRadius: 30, paddingHorizontal: 8, paddingVertical: 5 }, statusText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 15 }, infoItem: { width: '47%', flexGrow: 1 }, infoLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 }, infoValue: { color: C.white, fontSize: 9, fontWeight: '700', marginTop: 4 },
  pendingNote: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 13, paddingTop: 12 }, pendingNoteText: { color: C.amber, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }, pendingHelper: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 5 },
  reviewButtons: { flexDirection: 'row', gap: 8, marginTop: 10 }, approveButton: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: C.green }, approveText: { color: '#082014', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 }, rejectButton: { flex: 1, minHeight: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#774448', backgroundColor: '#301D25' }, rejectText: { color: C.red, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  rejectedNote: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 13, paddingTop: 11 }, rejectedNoteText: { color: C.red, fontSize: 9, lineHeight: 15 },
  roleButton: { minHeight: 39, justifyContent: 'center', alignItems: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#315F9B', backgroundColor: '#17375F', marginTop: 13 }, roleButtonText: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 17, padding: 17 },
  modalTitle: { color: C.white, fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  modalCopy: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 7, marginBottom: 10 },
  modalOption: { minHeight: 43, borderWidth: 1, borderColor: C.line, borderRadius: 9, backgroundColor: C.field, paddingHorizontal: 12, marginTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalOptionText: { color: C.white, fontSize: 10, fontWeight: '800' }, modalArrow: { color: C.pale, fontSize: 20 },
  modalCancel: { minHeight: 40, alignItems: 'center', justifyContent: 'center', marginTop: 11 }, modalCancelText: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  disabled: { opacity: 0.6 }, empty: { minHeight: 135, borderWidth: 1, borderColor: C.line, borderRadius: 13, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 5 }, emptyTitle: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, emptyText: { color: C.muted, fontSize: 10, marginTop: 6 }, footer: { color: '#66758B', fontSize: 7, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 23 }, loading: { alignItems: 'center', justifyContent: 'center' },
});
