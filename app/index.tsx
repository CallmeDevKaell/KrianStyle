import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const contentWidth = Math.min(width - 36, 560);

const COLORS = {
  background: '#09080D',
  surface: '#14121B',
  surfaceRaised: '#1B1723',
  blue: '#3185FF',
  blueLight: '#78AFFF',
  white: '#F8F7FC',
  muted: '#A6A1B1',
  line: '#302B3A',
};

const officers = [
  { role: 'President', name: 'Michael Angelo Dielen' },
  { role: 'Vice President', name: 'Carlo Simbajon' },
  { role: 'Moderator', name: 'Genbel Ian Tan' },
  { role: 'Secretary', name: 'Janmar Salor' },
  { role: 'Treasurer', name: 'Mark Reyes' },
  { role: 'Auditor', name: 'Pending' },
  { role: 'Editor', name: 'John Lorenz Vergara' },
  { role: 'Assistant Editor', name: 'Karl Ivan Logpit' },
  { role: 'Media', name: 'John Paul Sibonga' },
  { role: 'Assistant Media', name: 'Johnmark Remedio' },
];

type SectionKey = 'story' | 'zone' | 'officers';

export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const storyY = useRef(0);
  const zoneY = useRef(0);
  const officersY = useRef(0);
  const [activeSection, setActiveSection] = useState<SectionKey>('story');

  const goTo = (section: SectionKey, y: number) => {
    setActiveSection(section);
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  };

  const navItems = [
    { key: 'story' as const, label: 'KRIANSTYLE', onPress: () => goTo('story', storyY.current) },
    { key: 'zone' as const, label: 'CARMEN ZONE', onPress: () => goTo('zone', zoneY.current) },
    { key: 'officers' as const, label: 'OFFICERS', onPress: () => goTo('officers', officersY.current) },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.topHeader}>
        <View style={styles.logoPair}>
          <Image
            source={require('../assets/krianstyle-main-logo.jpg')}
            style={styles.mainHeaderLogo}
            contentFit="cover"
          />
          <View style={styles.logoDivider} />
          <Image
            source={require('../assets/bohol-carmen-zone.jpg')}
            style={styles.zoneHeaderLogo}
            contentFit="contain"
          />
        </View>
      </View>

      <View style={styles.navShell}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navContent}
        >
          {navItems.map((item) => {
            const selected = activeSection === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                style={[styles.navItem, selected && styles.navItemActive]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.navText, selected && styles.navTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>BOHOL ZONE  /  DISTRICT 3</Text>
          </View>
          <Text style={styles.heroEyebrow}>MORE THAN A RIDE.</Text>
          <Text style={styles.heroTitle}>ONE PASSION.</Text>
          <Text style={styles.heroTitleAccent}>ONE BROTHERHOOD.</Text>
          <Text style={styles.heroCopy}>
            Built by riders, united by the road, and connected through one community.
          </Text>
          <View style={styles.heroButtons}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => goTo('zone', zoneY.current)}
            >
              <Text style={styles.primaryButtonText}>EXPLORE CARMEN ZONE</Text>
              <Text style={styles.buttonArrow}>↓</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => goTo('story', storyY.current)}
            >
              <Text style={styles.secondaryButtonText}>OUR KRIANSTYLE STORY</Text>
            </Pressable>
          </View>
          <View style={styles.heroMetaRow}>
            <View>
              <Text style={styles.metaLabel}>ESTABLISHED</Text>
              <Text style={styles.metaValue}>05 OCT 2022</Text>
            </View>
            <View style={styles.metaDivider} />
            <View>
              <Text style={styles.metaLabel}>OUR HOME</Text>
              <Text style={styles.metaValue}>BOHOL, PH</Text>
            </View>
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => { storyY.current = event.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionKicker}>THE COMMUNITY BEHIND THE NAME</Text>
          <Text style={styles.sectionTitle}>THE KRIANSTYLE STORY.</Text>
          <Text style={styles.sectionCopy}>
            KrianStyle Philippines is a rider community established on October 5, 2022.
            What brings us together is more than motorcycles: it is the shared passion,
            friendships, and respect built through every ride and every gathering.
          </Text>

          <View style={styles.storyLogoCard}>
            <Image
              source={require('../assets/krianstyle-main-logo.jpg')}
              style={styles.storyLogo}
              contentFit="cover"
            />
            <Text style={styles.storyLogoCaption}>KRIANSTYLE PHILIPPINES</Text>
            <Text style={styles.storyDate}>ESTABLISHED • 05 OCTOBER 2022</Text>
          </View>

          <View style={styles.valuesRow}>
            <View style={styles.valueCard}>
              <Text style={styles.valueIcon}>01</Text>
              <Text style={styles.valueTitle}>BROTHERHOOD</Text>
              <Text style={styles.valueCopy}>Stronger together, on the road and beyond.</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={[styles.valueIcon, styles.valueIconBlue]}>02</Text>
              <Text style={styles.valueTitle}>RESPECT</Text>
              <Text style={styles.valueCopy}>Ride with discipline. Respect everyone.</Text>
            </View>
            <View style={styles.valueCard}>
              <Text style={[styles.valueIcon, styles.valueIconBlue]}>03</Text>
              <Text style={styles.valueTitle}>PASSION</Text>
              <Text style={styles.valueCopy}>Keep the passion alive in every journey.</Text>
            </View>
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => { zoneY.current = event.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionKicker}>OUR LOCAL CHAPTER</Text>
          <Text style={styles.sectionTitle}>CARMEN ZONE.</Text>
          <Text style={styles.sectionCopy}>
            Proudly representing KrianStyle Philippines in Bohol Zone — District 3,
            Carmen Zone.
          </Text>

          <View style={styles.zoneCard}>
            <View style={styles.zoneIdentityRow}>
              <Image
                source={require('../assets/bohol-carmen-zone.jpg')}
                style={styles.zoneLogo}
                contentFit="contain"
              />
              <View style={styles.zoneIdentityText}>
                <Text style={styles.zoneCardKicker}>KRIANSTYLE PHILIPPINES</Text>
                <Text style={styles.zoneCardTitle}>BOHOL ZONE</Text>
                <Text style={styles.zoneCardSub}>DISTRICT 3 — CARMEN ZONE</Text>
              </View>
            </View>
            <View style={styles.cardDivider} />
            <Text style={styles.leadersHeading}>ZONE LEADERSHIP</Text>
            <View style={styles.leaderRow}>
              <View style={styles.leaderInitial}><Text style={styles.leaderInitialText}>P</Text></View>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderRole}>PRESIDENT</Text>
                <Text style={styles.leaderName}>Michael Angelo Dielen</Text>
              </View>
            </View>
            <View style={styles.leaderRow}>
              <View style={[styles.leaderInitial, styles.leaderInitialAlt]}><Text style={styles.leaderInitialText}>VP</Text></View>
              <View style={styles.leaderInfo}>
                <Text style={styles.leaderRole}>VICE PRESIDENT</Text>
                <Text style={styles.leaderName}>Carlo Simbajon</Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={styles.section}
          onLayout={(event) => { officersY.current = event.nativeEvent.layout.y; }}
        >
          <Text style={styles.sectionKicker}>THE PEOPLE WHO SERVE</Text>
          <Text style={styles.sectionTitle}>OUR OFFICERS.</Text>
          <Text style={styles.sectionCopy}>
            Meet the officers of KrianStyle Bohol Zone — District 3, Carmen Zone.
          </Text>

          <View style={styles.officersList}>
            {officers.map((officer, index) => (
              <View style={styles.officerRow} key={officer.role}>
                <View style={styles.officerNumber}>
                  <Text style={styles.officerNumberText}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <View style={styles.officerDetails}>
                  <Text style={styles.officerRole}>{officer.role}</Text>
                  <Text style={[styles.officerName, officer.name === 'Pending' && styles.pendingName]}>
                    {officer.name}
                  </Text>
                </View>
                {officer.name === 'Pending' && (
                  <View style={styles.pendingBadge}><Text style={styles.pendingBadgeText}>TBA</Text></View>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.closingCard}>
          <Text style={styles.closingKicker}>YOUR ROAD. YOUR PEOPLE.</Text>
          <Text style={styles.closingTitle}>THE RIDE IS BETTER TOGETHER.</Text>
          <Text style={styles.closingCopy}>
            KrianStyle Bohol Zone • District 3 — Carmen Zone
          </Text>
          <Pressable style={styles.backButton} onPress={() => goTo('story', storyY.current)}>
            <Text style={styles.backButtonText}>BACK TO KRIANSTYLE</Text>
            <Text style={styles.buttonArrow}>↑</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerName}>KRIANSTYLE PHILIPPINES</Text>
          <Text style={styles.footerSub}>BOHOL ZONE • DISTRICT 3 — CARMEN ZONE</Text>
          <Text style={styles.footerCopyright}>EST. 05 OCT 2022  ·  RIDE WITH PRIDE.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  topHeader: {
    minHeight: 88,
    width: '100%',
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  logoPair: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mainHeaderLogo: { width: 124, height: 68, borderRadius: 8 },
  logoDivider: { width: 1, height: 42, backgroundColor: COLORS.line },
  zoneHeaderLogo: { width: 76, height: 76 },
  navShell: { borderBottomWidth: 1, borderBottomColor: COLORS.line, backgroundColor: '#0E0C13' },
  navContent: { width: '100%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  navItem: { borderRadius: 30, borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 16, paddingVertical: 9 },
  navItemActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  navText: { color: COLORS.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  navTextActive: { color: '#071426' },
  screen: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { alignItems: 'center', paddingBottom: 28 },
  hero: { width: contentWidth, paddingTop: 34, paddingBottom: 30, alignItems: 'center', overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: 90, width: 270, height: 270, borderRadius: 140, backgroundColor: '#102B50', opacity: 0.28 },
  heroTag: { borderWidth: 1, borderColor: '#315F9B', backgroundColor: '#10213A', borderRadius: 30, paddingHorizontal: 13, paddingVertical: 7, marginBottom: 22 },
  heroTagText: { color: '#A9CCFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  heroEyebrow: { color: COLORS.muted, fontSize: 11, fontWeight: '900', letterSpacing: 3.2, marginBottom: 7 },
  heroTitle: { color: COLORS.white, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -1.2, textAlign: 'center' },
  heroTitleAccent: { color: COLORS.blue, fontSize: 29, lineHeight: 36, fontWeight: '900', letterSpacing: -1.1, textAlign: 'center' },
  heroCopy: { color: COLORS.muted, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 310, marginTop: 13 },
  heroButtons: { width: '100%', gap: 10, marginTop: 24 },
  primaryButton: { minHeight: 51, backgroundColor: COLORS.blue, borderRadius: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  primaryButtonText: { color: '#071426', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  buttonArrow: { color: '#071426', fontSize: 17, fontWeight: '900' },
  secondaryButton: { minHeight: 49, borderWidth: 1, borderColor: '#315F9B', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  secondaryButtonText: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroMetaRow: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 25, marginTop: 25, paddingTop: 19, borderTopWidth: 1, borderTopColor: COLORS.line },
  metaLabel: { color: COLORS.muted, fontSize: 8, fontWeight: '800', letterSpacing: 1.6, marginBottom: 5 },
  metaValue: { color: COLORS.white, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  metaDivider: { width: 1, height: 28, backgroundColor: COLORS.line },
  section: { width: contentWidth, paddingTop: 32, paddingBottom: 35, borderTopWidth: 1, borderTopColor: COLORS.line },
  sectionKicker: { color: COLORS.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 2.1, marginBottom: 9 },
  sectionTitle: { color: COLORS.white, fontSize: 25, lineHeight: 30, fontWeight: '900', letterSpacing: -0.5 },
  sectionCopy: { color: COLORS.muted, fontSize: 12, lineHeight: 20, marginTop: 9, marginBottom: 18 },
  storyLogoCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, padding: 12, alignItems: 'center' },
  storyLogo: { width: Math.min(contentWidth - 52, 300), height: 116, borderRadius: 10 },
  storyLogoCaption: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 10 },
  storyDate: { color: COLORS.blue, fontSize: 8, fontWeight: '800', letterSpacing: 1.3, marginTop: 5 },
  valuesRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  valueCard: { flex: 1, minHeight: 116, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 10 },
  valueIcon: { color: '#A9CCFF', fontSize: 11, fontWeight: '900', marginBottom: 10 },
  valueIconBlue: { color: COLORS.blue },
  valueTitle: { color: COLORS.white, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  valueCopy: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 5 },
  zoneCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, padding: 15 },
  zoneIdentityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  zoneLogo: { width: 112, height: 112 },
  zoneIdentityText: { flex: 1 },
  zoneCardKicker: { color: COLORS.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  zoneCardTitle: { color: COLORS.white, fontSize: 19, fontWeight: '900', letterSpacing: 0.6, marginTop: 5 },
  zoneCardSub: { color: COLORS.blue, fontSize: 9, lineHeight: 14, fontWeight: '900', letterSpacing: 0.6, marginTop: 5 },
  cardDivider: { height: 1, backgroundColor: COLORS.line, marginVertical: 16 },
  leadersHeading: { color: COLORS.blueLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.8, marginBottom: 9 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9 },
  leaderInitial: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#183B65', alignItems: 'center', justifyContent: 'center' },
  leaderInitialAlt: { backgroundColor: '#17385E' },
  leaderInitialText: { color: COLORS.blue, fontSize: 11, fontWeight: '900' },
  leaderInfo: { flex: 1 },
  leaderRole: { color: COLORS.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  leaderName: { color: COLORS.white, fontSize: 13, fontWeight: '800', marginTop: 4 },
  officersList: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, borderRadius: 16, paddingHorizontal: 13 },
  officerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.line, gap: 12 },
  officerNumber: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#142A45', borderWidth: 1, borderColor: '#315F9B', alignItems: 'center', justifyContent: 'center' },
  officerNumberText: { color: COLORS.blue, fontSize: 9, fontWeight: '900' },
  officerDetails: { flex: 1 },
  officerRole: { color: COLORS.blueLight, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  officerName: { color: COLORS.white, fontSize: 12, fontWeight: '800', marginTop: 4 },
  pendingName: { color: COLORS.muted, fontStyle: 'italic' },
  pendingBadge: { borderRadius: 20, backgroundColor: '#142A45', paddingHorizontal: 9, paddingVertical: 5 },
  pendingBadgeText: { color: COLORS.blue, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  closingCard: { width: contentWidth, padding: 21, borderRadius: 17, backgroundColor: '#10223D', borderWidth: 1, borderColor: '#315F9B', alignItems: 'flex-start' },
  closingKicker: { color: COLORS.blue, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  closingTitle: { color: COLORS.white, fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 11 },
  closingCopy: { color: '#B5C9E2', fontSize: 11, lineHeight: 18, marginTop: 8, marginBottom: 17 },
  backButton: { width: '100%', height: 46, borderRadius: 11, backgroundColor: COLORS.blue, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 },
  backButtonText: { color: '#071426', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  footer: { width: contentWidth, alignItems: 'center', paddingTop: 25, paddingBottom: 8 },
  footerName: { color: COLORS.white, fontSize: 10, fontWeight: '900', letterSpacing: 2.3 },
  footerSub: { color: COLORS.blue, fontSize: 8, fontWeight: '800', letterSpacing: 1, textAlign: 'center', marginTop: 7 },
  footerCopyright: { color: '#777181', fontSize: 8, fontWeight: '700', letterSpacing: 1, marginTop: 14 },
});
