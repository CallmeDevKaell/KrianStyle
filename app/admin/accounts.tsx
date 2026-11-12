import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { adminRequest, getAdminAccounts } from '../../lib/adminApi';
import type { AdminAccount, AccountRole } from '../../lib/adminApi';
import { useAdminGuard } from '../../lib/useAdminGuard';

const C = { bg: '#090D16', card: '#121C2B', field: '#17243A', blue: '#3185FF', pale: '#8DBBFF', white: '#F7FAFF', muted: '#9AA9BE', line: '#293A52', green: '#4DD6A0', amber: '#FFC76A' };
type Filter = 'all' | 'president_vp' | 'officer' | 'member' | 'admin';
type NewRole = Exclude<AccountRole, 'admin'>;

export default function AccountManagementScreen() {
  const router = useRouter();
  const { profile, checking } = useAdminGuard();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await getAdminAccounts();
      setAccounts(rows);
    } catch (error) {
      Alert.alert('Unable to load accounts', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { if (profile) void load(); }, [profile, load]);

  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return accounts.filter((account) => {
      const matchesRole = filter === 'all' || account.role === filter;
      const matchesSearch = !query || [account.username, account.full_name, account.unit_name, account.unit]
        .some((value) => String(value ?? '').toLowerCase().includes(query));
      return matchesRole && matchesSearch;
    });
  }, [accounts, filter, search]);

  const changeRole = (account: AdminAccount, role: NewRole, position: 'president' | 'vice_president' | null) => {
    const label = role === 'president_vp'
      ? (position === 'president' ? 'President' : 'Vice President')
      : role === 'officer' ? 'Officer' : 'Member';
    Alert.alert('Update account role', `Change ${account.full_name}'s access to ${label}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm', onPress: async () => {
          setUpdatingId(account.user_id);
          try {
            await adminRequest({ action: 'update_role', user_id: account.user_id, role, position });
            setExpandedId(null);
            await load();
            Alert.alert('Account updated', `${account.full_name} is now assigned as ${label}.`);
          } catch (error) {
            Alert.alert('Update failed', error instanceof Error ? error.message : 'Please try again.');
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  if (checking || !profile) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.blue} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <Pressable onPress={() => router.replace('/admin')} style={styles.back}><Text style={styles.backText}>‹  ADMIN DASHBOARD</Text></Pressable>
        <Text style={styles.eyebrow}>ADMIN TOOLS / USER DIRECTORY</Text>
        <Text style={styles.title}>ACCOUNT MANAGEMENT.</Text>
        <Text style={styles.subtitle}>Review registered accounts and manage non-admin access levels.</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}><Text style={styles.summaryValue}>{accounts.length}</Text><Text style={styles.summaryLabel}>TOTAL ACCOUNTS</Text></View>
          <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: C.blue }]}>{accounts.filter((item) => item.role === 'president_vp').length}</Text><Text style={styles.summaryLabel}>PRESIDENT / VP</Text></View>
          <View style={styles.summaryCard}><Text style={[styles.summaryValue, { color: C.green }]}>{accounts.filter((item) => item.role === 'officer').length}</Text><Text style={styles.summaryLabel}>OFFICERS</Text></View>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search username, name, or unit" placeholderTextColor="#718199" style={styles.searchInput} autoCapitalize="none" autoCorrect={false} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip label="ALL" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterChip label="ADMIN" selected={filter === 'admin'} onPress={() => setFilter('admin')} />
          <FilterChip label="PRESIDENT / VP" selected={filter === 'president_vp'} onPress={() => setFilter('president_vp')} />
          <FilterChip label="OFFICERS" selected={filter === 'officer'} onPress={() => setFilter('officer')} />
          <FilterChip label="MEMBERS" selected={filter === 'member'} onPress={() => setFilter('member')} />
        </ScrollView>

        <View style={styles.listHeading}>
          <Text style={styles.listTitle}>REGISTERED ACCOUNTS</Text>
          <Text style={styles.listCount}>{visibleAccounts.length} FOUND</Text>
        </View>

        {loading ? (
          <View style={styles.empty}><ActivityIndicator color={C.blue} /><Text style={styles.emptyText}>Loading accounts...</Text></View>
        ) : visibleAccounts.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>NO ACCOUNTS FOUND</Text><Text style={styles.emptyText}>Try another search or filter.</Text></View>
        ) : visibleAccounts.map((account) => {
          const isExpanded = expandedId === account.user_id;
          const isUpdating = updatingId === account.user_id;
          return (
            <View key={account.user_id} style={styles.accountCard}>
              <View style={styles.accountTop}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(account.full_name || account.username || '?').slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.accountIdentity}>
                  <Text style={styles.accountName}>{account.full_name}</Text>
                  <Text style={styles.username}>@{account.username}</Text>
                  <Text style={styles.unitText}>{account.unit_name} • {account.unit}</Text>
                </View>
                <RoleBadge role={account.role} position={account.position} />
              </View>
              <View style={styles.divider} />
              <View style={styles.detailRow}><Text style={styles.detailLabel}>CONTACT</Text><Text style={styles.detailValue}>{account.contact_number}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>REGISTERED</Text><Text style={styles.detailValue}>{new Date(account.created_at).toLocaleDateString()}</Text></View>
              <View style={styles.detailRow}><Text style={styles.detailLabel}>LAST SIGN-IN</Text><Text style={styles.detailValue}>{account.last_sign_in_at ? new Date(account.last_sign_in_at).toLocaleDateString() : 'Not yet signed in'}</Text></View>
              {account.role === 'admin' ? (
                <View style={styles.protectedNote}><Text style={styles.protectedText}>PROTECTED ADMIN ACCOUNT — ROLE CHANGES DISABLED</Text></View>
              ) : (
                <>
                  <Pressable disabled={isUpdating} style={styles.manageButton} onPress={() => setExpandedId(isExpanded ? null : account.user_id)}>
                    {isUpdating ? <ActivityIndicator color={C.pale} /> : <Text style={styles.manageButtonText}>{isExpanded ? 'CLOSE ROLE OPTIONS' : 'MANAGE ACCOUNT ROLE'}</Text>}
                  </Pressable>
                  {isExpanded && !isUpdating && (
                    <View style={styles.roleOptions}>
                      <Text style={styles.roleOptionsTitle}>ASSIGN ACCESS LEVEL</Text>
                      {account.role !== 'president_vp' && <>
                        <RoleOption title="PRESIDENT" detail="Leadership access" onPress={() => changeRole(account, 'president_vp', 'president')} />
                        <RoleOption title="VICE PRESIDENT" detail="Leadership access" onPress={() => changeRole(account, 'president_vp', 'vice_president')} />
                      </>}
                      {account.role !== 'officer' && <RoleOption title="OFFICER" detail="Officer access" onPress={() => changeRole(account, 'officer', null)} />}
                      {account.role !== 'member' && <RoleOption title="MEMBER" detail="Regular member access" onPress={() => changeRole(account, 'member', null)} />}
                    </View>
                  )}
                </>
              )}
            </View>
          );
        })}

        <View style={styles.notice}><Text style={styles.noticeTitle}>ACCOUNT SECURITY</Text><Text style={styles.noticeText}>Administrator accounts cannot be changed from this screen. Public registrations remain Members by default. Account deletion is intentionally not included here.</Text></View>
        <Text style={styles.footer}>KRIANSTYLE ADMIN • ACCOUNT DIRECTORY</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.filterChip, selected && styles.filterChipSelected]}><Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text></Pressable>;
}
function RoleBadge({ role, position }: { role: AccountRole; position: AdminAccount['position'] }) {
  let label = role.replace('_', ' ').toUpperCase();
  if (role === 'president_vp' && position) label = position === 'president' ? 'PRESIDENT' : 'VICE PRESIDENT';
  return <View style={[styles.roleBadge, role === 'admin' && styles.adminBadge, role === 'president_vp' && styles.leaderBadge, role === 'officer' && styles.officerBadge]}><Text style={styles.roleBadgeText}>{label}</Text></View>;
}
function RoleOption({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.roleOption}><View style={styles.roleOptionText}><Text style={styles.roleOptionTitle}>{title}</Text><Text style={styles.roleOptionDetail}>{detail}</Text></View><Text style={styles.roleOptionArrow}>›</Text></Pressable>;
}
function Loading() { return <SafeAreaView style={[styles.safe, styles.loading]}><ActivityIndicator color={C.blue} /><Text style={styles.emptyText}>Verifying administrator access...</Text></SafeAreaView>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 35 },
  back: { alignSelf: 'flex-start', paddingVertical: 11, paddingRight: 15 }, backText: { color: C.pale, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: C.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1.7, marginTop: 12 }, title: { color: C.white, fontSize: 23, fontWeight: '900', letterSpacing: -0.5, marginTop: 7 }, subtitle: { color: C.muted, fontSize: 11, lineHeight: 18, marginTop: 7 },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 20 }, summaryCard: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12 }, summaryValue: { color: C.white, fontSize: 20, fontWeight: '900' }, summaryLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.6, marginTop: 6 },
  searchBox: { minHeight: 47, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.field, borderRadius: 11, paddingHorizontal: 12, marginTop: 20 }, searchIcon: { color: C.blueLight, fontSize: 22, marginRight: 8 }, searchInput: { flex: 1, color: C.white, fontSize: 11, paddingVertical: 10 },
  filters: { gap: 7, paddingVertical: 14 }, filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }, filterChipSelected: { backgroundColor: C.blue, borderColor: C.blue }, filterText: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 }, filterTextSelected: { color: '#061326' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 }, listTitle: { color: C.white, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 }, listCount: { color: C.blueLight, fontSize: 8, fontWeight: '900' },
  accountCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 13, marginBottom: 10 }, accountTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 39, height: 39, borderRadius: 12, backgroundColor: '#17375F', borderWidth: 1, borderColor: '#315F9B', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: C.pale, fontSize: 15, fontWeight: '900' }, accountIdentity: { flex: 1 }, accountName: { color: C.white, fontSize: 12, fontWeight: '900' }, username: { color: C.blueLight, fontSize: 9, marginTop: 3 }, unitText: { color: C.muted, fontSize: 8, marginTop: 4 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: '#25364D' }, adminBadge: { backgroundColor: '#382F52' }, leaderBadge: { backgroundColor: '#163F6B' }, officerBadge: { backgroundColor: '#174639' }, roleBadgeText: { color: C.white, fontSize: 7, fontWeight: '900', letterSpacing: 0.4 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 11 }, detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }, detailLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.9 }, detailValue: { color: C.white, fontSize: 9, fontWeight: '700', maxWidth: '65%', textAlign: 'right' },
  manageButton: { minHeight: 38, borderWidth: 1, borderColor: '#315F9B', borderRadius: 9, backgroundColor: '#142B49', alignItems: 'center', justifyContent: 'center', marginTop: 11 }, manageButtonText: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  roleOptions: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 12, paddingTop: 11 }, roleOptionsTitle: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 7 }, roleOption: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.line, borderRadius: 9, paddingHorizontal: 11, marginTop: 6, backgroundColor: C.field }, roleOptionText: { flex: 1 }, roleOptionTitle: { color: C.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }, roleOptionDetail: { color: C.muted, fontSize: 8, marginTop: 3 }, roleOptionArrow: { color: C.blueLight, fontSize: 21 },
  protectedNote: { borderWidth: 1, borderColor: '#4A3C6A', backgroundColor: '#211B32', borderRadius: 8, padding: 9, marginTop: 11 }, protectedText: { color: '#C8B6F2', fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  empty: { backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderRadius: 13, minHeight: 110, justifyContent: 'center', alignItems: 'center', padding: 17, marginTop: 10 }, emptyTitle: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, emptyText: { color: C.muted, fontSize: 10, marginTop: 8 },
  notice: { backgroundColor: '#101C2C', borderWidth: 1, borderColor: '#253B57', borderRadius: 11, padding: 12, marginTop: 15 }, noticeTitle: { color: C.pale, fontSize: 8, fontWeight: '900', letterSpacing: 1 }, noticeText: { color: C.muted, fontSize: 9, lineHeight: 15, marginTop: 5 }, footer: { color: '#66758B', fontSize: 7, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 22 }, loading: { alignItems: 'center', justifyContent: 'center' },
});
