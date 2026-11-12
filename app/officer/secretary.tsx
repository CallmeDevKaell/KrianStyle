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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useOfficerGuard } from '../../lib/useOfficerGuard';

type AttendanceType = 'eyeball' | 'meeting';
type Member = { user_id: string; full_name: string; username: string };
type AttendanceSession = {
  id: string;
  attendance_type: AttendanceType;
  session_number: number;
  attendance_date: string;
};
type AttendanceMark = {
  id: string;
  session_id: string;
  member_id: string;
  member_name: string;
};

const C = {
  bg: '#080D17',
  panel: '#101B2B',
  panelSoft: '#132238',
  field: '#0B1524',
  blue: '#398BFF',
  blueLight: '#A6CCFF',
  white: '#F5F8FE',
  muted: '#91A2BA',
  line: '#263A55',
  green: '#50D7A5',
  red: '#FF8585',
};

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function fromISODate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function displayDate(value: string) {
  return fromISODate(value).toLocaleDateString('en-PH', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function ordinal(value: number) {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1: return `${value}st`;
    case 2: return `${value}nd`;
    case 3: return `${value}rd`;
    default: return `${value}th`;
  }
}

export default function SecretaryAttendanceScreen() {
  const router = useRouter();
  const { profile, checking } = useOfficerGuard('secretary');
  const [activeType, setActiveType] = useState<AttendanceType>('eyeball');
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [marks, setMarks] = useState<AttendanceMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingSession, setCreatingSession] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [busyMark, setBusyMark] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    try {
      const [memberResult, sessionResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, username')
          .eq('role', 'member')
          .eq('approval_status', 'approved')
          .order('full_name', { ascending: true }),
        supabase
          .from('attendance_sessions')
          .select('id, attendance_type, session_number, attendance_date')
          .eq('attendance_type', activeType)
          .order('session_number', { ascending: true }),
      ]);

      if (memberResult.error) throw memberResult.error;
      if (sessionResult.error) throw sessionResult.error;

      const nextMembers = (memberResult.data ?? []) as Member[];
      const nextSessions = (sessionResult.data ?? []) as AttendanceSession[];
      setMembers(nextMembers);
      setSessions(nextSessions);

      if (nextSessions.length) {
        const { data, error } = await supabase
          .from('attendance_marks')
          .select('id, session_id, member_id, member_name')
          .in('session_id', nextSessions.map((session) => session.id));
        if (error) throw error;
        setMarks((data ?? []) as AttendanceMark[]);
      } else {
        setMarks([]);
      }
    } catch (error) {
      Alert.alert(
        'Unable to load attendance',
        error instanceof Error ? error.message : 'Please refresh and try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeType]);

  useEffect(() => {
    if (profile) void loadAttendance();
  }, [profile, loadAttendance]);

  const markLookup = useMemo(() => {
    const lookup = new Map<string, AttendanceMark>();
    for (const mark of marks) lookup.set(`${mark.session_id}:${mark.member_id}`, mark);
    return lookup;
  }, [marks]);

  const presentCount = marks.length;
  const attendanceLabel = activeType === 'eyeball' ? 'EB' : 'MEETING';

  const addSession = async (selectedDate: string) => {
    if (!profile) return;
    setCreatingSession(true);
    try {
      // Retry if another secretary session is added at the same time.
      let created = false;
      for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
        const { data: latest, error: latestError } = await supabase
          .from('attendance_sessions')
          .select('session_number')
          .eq('attendance_type', activeType)
          .order('session_number', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (latestError) throw latestError;

        const nextNumber = (latest?.session_number ?? 0) + 1;
        const { error: insertError } = await supabase.from('attendance_sessions').insert({
          attendance_type: activeType,
          session_number: nextNumber,
          attendance_date: selectedDate,
          created_by: profile.user_id,
        });

        if (!insertError) {
          created = true;
        } else if (insertError.code !== '23505') {
          throw insertError;
        }
      }

      if (!created) throw new Error('Another session was added at the same time. Please try adding again.');
      setDatePickerOpen(false);
      await loadAttendance();
      Alert.alert('Session added', `${ordinal(sessions.length + 1)} ${attendanceLabel} is now ready. The selected date will be used for every member checked in this session.`);
    } catch (error) {
      Alert.alert('Unable to add session', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setCreatingSession(false);
    }
  };

  const toggleMark = async (member: Member, session: AttendanceSession) => {
    if (!profile) return;
    const key = `${session.id}:${member.user_id}`;
    const existing = markLookup.get(key);
    setBusyMark(key);
    try {
      if (existing) {
        const { error } = await supabase
          .from('attendance_marks')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        setMarks((current) => current.filter((item) => item.id !== existing.id));
      } else {
        const { data, error } = await supabase
          .from('attendance_marks')
          .insert({
            session_id: session.id,
            member_id: member.user_id,
            member_name: member.full_name,
            checked_by: profile.user_id,
          })
          .select('id, session_id, member_id, member_name')
          .single();
        if (error) {
          if (error.code === '23505') return;
          throw error;
        }
        setMarks((current) => [...current, data as AttendanceMark]);
      }
    } catch (error) {
      Alert.alert('Unable to update attendance', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusyMark(null);
    }
  };

  if (checking || !profile) return <Loading />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.blue}
            onRefresh={() => { setRefreshing(true); void loadAttendance(); }}
          />
        )}
      >
        <View style={styles.topRow}>
          <Pressable onPress={() => router.replace('/officer')} style={styles.backButton}>
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.eyebrow}>KRIANSTYLE • OFFICER PORTAL</Text>
            <Text style={styles.heading}>Secretary</Text>
          </View>
          <View style={styles.rolePill}><Text style={styles.rolePillText}>SECRETARY</Text></View>
        </View>

        <View style={styles.welcomeCard}>
          <View style={styles.welcomeMark}><Text style={styles.welcomeMarkText}>KS</Text></View>
          <View style={styles.welcomeCopy}>
            <Text style={styles.welcomeTitle}>Attendance Register</Text>
            <Text style={styles.welcomeSubtitle}>Welcome, {profile.full_name}. Check attendance by session.</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{members.length}</Text>
            <Text style={styles.statLabel}>REGISTERED MEMBERS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={styles.statLabel}>{activeType === 'eyeball' ? 'EB SESSIONS' : 'MEETINGS'}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{presentCount}</Text>
            <Text style={styles.statLabel}>CHECKED ATTENDANCE</Text>
          </View>
        </View>

        <View style={styles.typeSwitcher}>
          <Pressable
            onPress={() => setActiveType('eyeball')}
            style={[styles.typeButton, activeType === 'eyeball' && styles.typeButtonActive]}
          >
            <Text style={styles.typeIcon}>●</Text>
            <View>
              <Text style={[styles.typeTitle, activeType === 'eyeball' && styles.typeTitleActive]}>Eyeball</Text>
              <Text style={styles.typeCaption}>EB attendance</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => setActiveType('meeting')}
            style={[styles.typeButton, activeType === 'meeting' && styles.typeButtonActive]}
          >
            <Text style={styles.typeIcon}>▤</Text>
            <View>
              <Text style={[styles.typeTitle, activeType === 'meeting' && styles.typeTitleActive]}>Meeting</Text>
              <Text style={styles.typeCaption}>Meeting attendance</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.registerHeader}>
          <View style={styles.registerCopy}>
            <Text style={styles.sectionTitle}>{activeType === 'eyeball' ? 'EYEBALL ATTENDANCE' : 'MEETING ATTENDANCE'}</Text>
            <Text style={styles.sectionCaption}>One selected date for every member in each session.</Text>
          </View>
          <Pressable
            onPress={() => setDatePickerOpen(true)}
            disabled={creatingSession}
            style={[styles.addButton, creatingSession && styles.dimmed]}
          >
            {creatingSession ? <ActivityIndicator color="#071528" /> : <Text style={styles.addButtonText}>＋ ADD {attendanceLabel}</Text>}
          </Pressable>
        </View>

        <View style={styles.instructionCard}>
          <Text style={styles.instructionDot}>i</Text>
          <Text style={styles.instructionText}>
            Add a session and choose its date once. Then tap the checkbox beside each member who attended. No need to enter the date for every person.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}><ActivityIndicator color={C.blue} /><Text style={styles.loadingText}>Loading member register…</Text></View>
        ) : members.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyTitle}>No approved members yet</Text>
            <Text style={styles.emptyCopy}>Registered and approved Member accounts will appear here automatically.</Text>
          </View>
        ) : (
          <View style={styles.tableShell}>
            <View style={styles.tableTopline}>
              <Text style={styles.tableTitle}>MEMBER CHECKLIST</Text>
              <Text style={styles.tableHint}>Swipe sideways for more sessions →</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.tableHeaderRow}>
                  <View style={[styles.nameColumn, styles.nameHeader]}>
                    <Text style={styles.nameHeaderText}>MEMBER NAME</Text>
                  </View>
                  {sessions.map((session) => (
                    <View key={session.id} style={styles.sessionHeaderCell}>
                      <Text style={styles.sessionNumber}>{ordinal(session.session_number)} {attendanceLabel}</Text>
                      <Text style={styles.sessionDate}>{displayDate(session.attendance_date)}</Text>
                      <Text style={styles.sessionCount}>
                        {marks.filter((mark) => mark.session_id === session.id).length} PRESENT
                      </Text>
                    </View>
                  ))}
                </View>
                {members.map((member, index) => (
                  <View key={member.user_id} style={[styles.tableMemberRow, index % 2 === 1 && styles.tableMemberRowAlt]}>
                    <View style={styles.nameColumn}>
                      <Text style={styles.memberFullName} numberOfLines={2}>{member.full_name}</Text>
                      <Text style={styles.memberUsername} numberOfLines={1}>@{member.username}</Text>
                    </View>
                    {sessions.map((session) => {
                      const key = `${session.id}:${member.user_id}`;
                      const isChecked = markLookup.has(key);
                      const isBusy = busyMark === key;
                      return (
                        <View key={session.id} style={styles.checkCell}>
                          <Pressable
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: isChecked, disabled: isBusy }}
                            accessibilityLabel={`${member.full_name}, ${ordinal(session.session_number)} ${attendanceLabel}`}
                            disabled={isBusy}
                            onPress={() => void toggleMark(member, session)}
                            style={[styles.checkBox, isChecked && styles.checkBoxActive, isBusy && styles.dimmed]}
                          >
                            {isBusy ? <ActivityIndicator size="small" color={C.blueLight} /> : (
                              <Text style={[styles.checkMark, isChecked && styles.checkMarkActive]}>{isChecked ? '✓' : ''}</Text>
                            )}
                          </Pressable>
                        </View>
                      );
                    })}
                    {sessions.length === 0 && (
                      <View style={styles.noSessionCell}><Text style={styles.noSessionText}>Add a session →</Text></View>
                    )}
                  </View>
                ))}
                {sessions.length === 0 && (
                  <View style={styles.noSessionsBanner}>
                    <Text style={styles.noSessionsText}>No {attendanceLabel} sessions yet. Tap “ADD {attendanceLabel}” to create the first one.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={styles.privacyNote}>
          <Text style={styles.privacyTitle}>SECRETARY ACCESS ONLY</Text>
          <Text style={styles.privacyCopy}>Only an approved Secretary account can view the Member roster and manage these Eyeball and Meeting checklists. Other Officer positions cannot edit these records.</Text>
        </View>
        <Text style={styles.footer}>KRIANSTYLE • SECRETARY ATTENDANCE REGISTER</Text>
      </ScrollView>

      <DatePickerModal
        visible={datePickerOpen}
        title={`DATE FOR ${ordinal(sessions.length + 1)} ${attendanceLabel}`}
        onClose={() => setDatePickerOpen(false)}
        onSelect={(date) => void addSession(date)}
        saving={creatingSession}
      />
    </SafeAreaView>
  );
}

type DatePickerModalProps = {
  visible: boolean;
  title: string;
  saving: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
};

function DatePickerModal({ visible, title, saving, onClose, onSelect }: DatePickerModalProps) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));

  useEffect(() => {
    if (visible) {
      const today = new Date();
      setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1));
      setSelectedDate(toISODate(today));
    }
  }, [visible]);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const todayISO = toISODate(new Date());

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalShade}>
        <View style={styles.calendarCard}>
          <View style={styles.calendarTop}>
            <View style={styles.calendarTopCopy}>
              <Text style={styles.calendarEyebrow}>CHOOSE DATE</Text>
              <Text style={styles.calendarTitle}>{title}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
          </View>

          <View style={styles.monthBar}>
            <Pressable onPress={() => setMonthCursor(new Date(year, month - 1, 1))} style={styles.monthArrow}>
              <Text style={styles.monthArrowText}>‹</Text>
            </Pressable>
            <Text style={styles.monthLabel}>{monthCursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</Text>
            <Pressable onPress={() => setMonthCursor(new Date(year, month + 1, 1))} style={styles.monthArrow}>
              <Text style={styles.monthArrowText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.calendarGrid}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <View key={`${day}-${index}`} style={styles.calendarCell}><Text style={styles.weekdayText}>{day}</Text></View>
            ))}
            {cells.map((day, index) => {
              if (!day) return <View key={`blank-${index}`} style={styles.calendarCell} />;
              const dateISO = toISODate(new Date(year, month, day));
              const selected = dateISO === selectedDate;
              const today = dateISO === todayISO;
              return (
                <View key={dateISO} style={styles.calendarCell}>
                  <Pressable
                    onPress={() => setSelectedDate(dateISO)}
                    style={[styles.dayButton, selected && styles.dayButtonSelected, today && !selected && styles.dayButtonToday]}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.selectedDateBar}>
            <Text style={styles.selectedDateLabel}>SELECTED DATE</Text>
            <Text style={styles.selectedDateValue}>{displayDate(selectedDate)}</Text>
          </View>
          <View style={styles.calendarActions}>
            <Pressable onPress={onClose} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></Pressable>
            <Pressable onPress={() => onSelect(selectedDate)} disabled={saving} style={[styles.confirmDateButton, saving && styles.dimmed]}>
              {saving ? <ActivityIndicator color="#071528" /> : <Text style={styles.confirmDateText}>CREATE SESSION</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Loading() {
  return (
    <SafeAreaView style={[styles.safe, styles.loadingScreen]}>
      <ActivityIndicator color={C.blue} size="large" />
      <Text style={styles.loadingText}>Verifying Secretary access…</Text>
    </SafeAreaView>
  );
}

const NAME_WIDTH = 168;
const SESSION_WIDTH = 112;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 38 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 17 },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: C.blueLight, fontSize: 29, lineHeight: 30, marginTop: -4 },
  topCopy: { flex: 1 },
  eyebrow: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  heading: { color: C.white, fontSize: 23, fontWeight: '900', marginTop: 2, letterSpacing: -0.4 },
  rolePill: { borderRadius: 20, borderWidth: 1, borderColor: '#315F9B', backgroundColor: '#102544', paddingHorizontal: 9, paddingVertical: 7 },
  rolePillText: { color: C.blueLight, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  welcomeCard: { borderWidth: 1, borderColor: '#244B7A', backgroundColor: '#10213A', borderRadius: 17, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  welcomeMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#173B68', alignItems: 'center', justifyContent: 'center' },
  welcomeMarkText: { color: '#C1DDFF', fontSize: 15, fontWeight: '900' },
  welcomeCopy: { flex: 1 },
  welcomeTitle: { color: C.white, fontSize: 14, fontWeight: '900' },
  welcomeSubtitle: { color: C.muted, fontSize: 9, lineHeight: 14, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  statCard: { flex: 1, minHeight: 70, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 10 },
  statValue: { color: C.white, fontSize: 20, fontWeight: '900' },
  statLabel: { color: C.muted, fontSize: 6, fontWeight: '900', letterSpacing: 0.5, marginTop: 5 },
  typeSwitcher: { flexDirection: 'row', gap: 9, marginTop: 17 },
  typeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 13, padding: 12 },
  typeButtonActive: { backgroundColor: '#102747', borderColor: C.blue },
  typeIcon: { color: C.blueLight, fontSize: 19, fontWeight: '900' },
  typeTitle: { color: C.white, fontSize: 11, fontWeight: '900' },
  typeTitleActive: { color: C.blueLight },
  typeCaption: { color: C.muted, fontSize: 8, marginTop: 3 },
  registerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 21, marginBottom: 11 },
  registerCopy: { flex: 1 },
  sectionTitle: { color: C.white, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  sectionCaption: { color: C.muted, fontSize: 8, marginTop: 4, lineHeight: 12 },
  addButton: { minHeight: 39, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.blue, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { color: '#061326', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  instructionCard: { backgroundColor: '#101D2D', borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 11, flexDirection: 'row', gap: 9, alignItems: 'center', marginBottom: 12 },
  instructionDot: { color: C.blueLight, borderWidth: 1, borderColor: '#315F9B', width: 19, height: 19, borderRadius: 10, textAlign: 'center', lineHeight: 17, fontWeight: '900', fontSize: 11, overflow: 'hidden' },
  instructionText: { color: C.muted, fontSize: 8, lineHeight: 13, flex: 1 },
  tableShell: { borderWidth: 1, borderColor: C.line, borderRadius: 14, overflow: 'hidden', backgroundColor: C.panel },
  tableTopline: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tableTitle: { color: C.white, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  tableHint: { color: C.muted, fontSize: 7 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#12243A', borderBottomWidth: 1, borderBottomColor: C.line },
  nameColumn: { width: NAME_WIDTH, minHeight: 57, justifyContent: 'center', paddingHorizontal: 11, borderRightWidth: 1, borderRightColor: C.line },
  nameHeader: { minHeight: 74, justifyContent: 'center' },
  nameHeaderText: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  sessionHeaderCell: { width: SESSION_WIDTH, minHeight: 74, borderRightWidth: 1, borderRightColor: C.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 7 },
  sessionNumber: { color: C.blueLight, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  sessionDate: { color: C.white, fontSize: 8, marginTop: 4, textAlign: 'center' },
  sessionCount: { color: C.green, fontSize: 6, fontWeight: '900', letterSpacing: 0.5, marginTop: 4 },
  tableMemberRow: { flexDirection: 'row', minHeight: 57, borderBottomWidth: 1, borderBottomColor: C.line },
  tableMemberRowAlt: { backgroundColor: '#0D1726' },
  memberFullName: { color: C.white, fontSize: 9, fontWeight: '800', lineHeight: 13 },
  memberUsername: { color: C.muted, fontSize: 7, marginTop: 3 },
  checkCell: { width: SESSION_WIDTH, minHeight: 57, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: C.line },
  checkBox: { width: 27, height: 27, borderRadius: 8, backgroundColor: C.field, borderWidth: 1, borderColor: '#47607F', alignItems: 'center', justifyContent: 'center' },
  checkBoxActive: { backgroundColor: C.blue, borderColor: C.blue },
  checkMark: { color: C.muted, fontSize: 14, fontWeight: '900' },
  checkMarkActive: { color: '#061326' },
  noSessionCell: { minWidth: SESSION_WIDTH, justifyContent: 'center', paddingHorizontal: 10 },
  noSessionText: { color: C.blueLight, fontSize: 8 },
  noSessionsBanner: { padding: 15, backgroundColor: '#0D1726' },
  noSessionsText: { color: C.muted, fontSize: 9, lineHeight: 14 },
  loadingCard: { minHeight: 150, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 9 },
  loadingText: { color: C.muted, fontSize: 9, marginTop: 5 },
  emptyCard: { minHeight: 160, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 22 },
  emptyIcon: { color: C.blueLight, fontSize: 29 },
  emptyTitle: { color: C.white, fontSize: 12, fontWeight: '900', marginTop: 7 },
  emptyCopy: { color: C.muted, fontSize: 9, textAlign: 'center', lineHeight: 14, marginTop: 6 },
  privacyNote: { backgroundColor: '#101923', borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 13, marginTop: 15 },
  privacyTitle: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  privacyCopy: { color: C.muted, fontSize: 8, lineHeight: 14, marginTop: 6 },
  footer: { color: '#64758D', fontSize: 7, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center', marginTop: 20 },
  dimmed: { opacity: 0.55 },
  loadingScreen: { alignItems: 'center', justifyContent: 'center' },
  modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 18 },
  calendarCard: { width: '100%', maxWidth: 390, alignSelf: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: '#315F9B', borderRadius: 19, padding: 16 },
  calendarTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  calendarTopCopy: { flex: 1 },
  calendarEyebrow: { color: C.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  calendarTitle: { color: C.white, fontSize: 14, fontWeight: '900', marginTop: 5 },
  closeButton: { width: 31, height: 31, borderRadius: 10, backgroundColor: C.field, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: C.white, fontSize: 22, lineHeight: 24, marginTop: -2 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17, marginBottom: 10 },
  monthArrow: { width: 35, height: 35, borderRadius: 10, backgroundColor: C.field, alignItems: 'center', justifyContent: 'center' },
  monthArrowText: { color: C.blueLight, fontSize: 25, lineHeight: 27, marginTop: -3 },
  monthLabel: { color: C.white, fontSize: 12, fontWeight: '900' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarCell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center' },
  weekdayText: { color: C.muted, fontSize: 9, fontWeight: '900' },
  dayButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dayButtonSelected: { backgroundColor: C.blue },
  dayButtonToday: { borderWidth: 1, borderColor: C.blue },
  dayText: { color: C.white, fontSize: 10, fontWeight: '700' },
  dayTextSelected: { color: '#061326', fontWeight: '900' },
  selectedDateBar: { backgroundColor: C.field, borderWidth: 1, borderColor: C.line, borderRadius: 11, padding: 11, marginTop: 10 },
  selectedDateLabel: { color: C.muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  selectedDateValue: { color: C.white, fontSize: 12, fontWeight: '900', marginTop: 4 },
  calendarActions: { flexDirection: 'row', gap: 9, marginTop: 13 },
  cancelButton: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: C.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  confirmDateButton: { flex: 1.4, minHeight: 44, backgroundColor: C.blue, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  confirmDateText: { color: '#061326', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
});
