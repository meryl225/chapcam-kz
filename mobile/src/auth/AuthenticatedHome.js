import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { BRAND, C, GAP, PAD, TOOLS, asset, shadow } from '../ui/catalog'
import { ExploreScreen } from '../screens/ExploreScreen'
import { LiveSwapScreen } from '../screens/LiveSwapScreen'

const INK_DEEP = '#0B1233'

const HERO_SLIDES = [
  {
    key: 'live',
    eyebrow: 'En direct',
    title: 'Change de visage\nen temps réel.',
    cta: 'Lancer Live Swap',
    image: '/swap/face-transformed.png',
    tool: 'live',
  },
  {
    key: 'video',
    eyebrow: 'Image en vidéo',
    title: 'Donne vie\nà tes photos.',
    cta: 'Créer une vidéo',
    image: '/swap/poster-photo-video.png',
    tool: 'video',
  },
  {
    key: 'image',
    eyebrow: 'Studio IA',
    title: 'Portraits\nde cinéma.',
    cta: 'Générer une image',
    image: '/dashboard/hero-avatar.jpg',
    tool: 'image',
  },
]

const QUICK_ACTIONS = [
  { key: 'live', label: 'Live Swap', hint: 'Temps réel', icon: 'videocam', colors: ['#FF3B6B', '#FF7A45'] },
  { key: 'image', label: 'Image IA', hint: 'Texte en image', icon: 'image', colors: [C.blue, '#3FA2FF'] },
  { key: 'video', label: 'Vidéo IA', hint: 'Photo en vidéo', icon: 'film', colors: [C.violet, '#B06BFF'] },
]

const TRENDS = [
  { key: 't1', title: 'Visage cinéma', tag: 'Live Swap', uses: '12,4k', image: '/images/hero/avatars/a1.png' },
  { key: 't2', title: 'Portrait animé', tag: 'Genjutsu', uses: '8,1k', image: '/images/hero/avatars/a3.png' },
  { key: 't3', title: 'Néon studio', tag: 'Motion', uses: '6,7k', image: '/images/hero/avatars/a4.png' },
  { key: 't4', title: 'Voix off pro', tag: 'Vocal', uses: '4,9k', image: '/images/hero/avatars/a5.png' },
  { key: 't5', title: 'Style éditorial', tag: 'Live Swap', uses: '3,2k', image: '/images/hero/avatars/a6.png' },
]

const FOR_YOU_LEFT = [
  { key: 'f1', title: 'Photo en vidéo', tag: 'Image en vidéo', image: '/swap/poster-photo-video.png', ratio: 1.45 },
  { key: 'f3', title: 'Avatar en mouvement', tag: 'Genjutsu', image: '/images/hero/avatars/a2.png', ratio: 1.05 },
]
const FOR_YOU_RIGHT = [
  { key: 'f2', title: 'Avant / après', tag: 'Live Swap', image: '/swap/face-original.png', ratio: 1.05 },
  { key: 'f4', title: 'Motion 3D', tag: 'Motion Control', image: '/swap/poster-motion.png', ratio: 1.45 },
]

const TOOL_LABELS = { image: 'Image IA', video: 'Vidéo IA' }

export function AuthenticatedHome(props) {
  return (
    <SafeAreaProvider>
      <HomeShell {...props} />
    </SafeAreaProvider>
  )
}

function HomeShell({ user }) {
  const insets = useSafeAreaInsets()
  const [tab, setTab] = useState('home')
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [openTool, setOpenTool] = useState(null)

  const loadAccount = useCallback(async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan,status,points,points_remaining,end_date,is_active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSubscription(data || null)
    setLoading(false)
    setRefreshing(false)
  }, [user.id])

  useEffect(() => { loadAccount() }, [loadAccount])

  const credits = subscription?.points_remaining ?? subscription?.points ?? 0
  const onRefresh = () => { setRefreshing(true); loadAccount() }

  const onOpenTool = (key) => {
    if (key === 'live') {
      setOpenTool('live')
      return
    }
    const title = TOOL_LABELS[key] ?? TOOLS.find((t) => t.key === key)?.title ?? 'Outil'
    Alert.alert(title, 'Cet outil arrive bientôt dans l’app iPhone.')
  }

  if (openTool === 'live') {
    return <LiveSwapScreen onBack={() => setOpenTool(null)} topInset={insets.top} bottomInset={insets.bottom} />
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {tab === 'home' ? (
        <HomeScreen
          credits={credits}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onOpenTool={onOpenTool}
        />
      ) : tab === 'explore' ? (
        <ExploreScreen onOpenTool={onOpenTool} />
      ) : (
        <PendingScreen tab={tab} user={user} credits={credits} plan={subscription?.plan} loading={loading} />
      )}
      <TabBar tab={tab} onChange={setTab} bottom={insets.bottom} />
    </View>
  )
}

function HomeScreen({ credits, loading, refreshing, onRefresh, onOpenTool }) {
  const { width } = useWindowDimensions()
  const colW = (width - PAD * 2 - GAP) / 2

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
    >
      <Header credits={credits} loading={loading} />
      <HeroCarousel width={width} onOpenTool={onOpenTool} />
      <QuickActions onOpenTool={onOpenTool} />

      <SectionHeader title="Tendances" subtitle="Les effets du moment" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendRow}
        decelerationRate="fast"
        snapToInterval={TREND_W + GAP}
      >
        {TRENDS.map((item) => <TrendCard key={item.key} item={item} />)}
      </ScrollView>

      <SectionHeader title="Pour toi" subtitle="Inspiré de tes créations" />
      <View style={styles.feed}>
        <View style={styles.feedCol}>
          {FOR_YOU_LEFT.map((item) => <FeedTile key={item.key} item={item} width={colW} />)}
        </View>
        <View style={styles.feedCol}>
          {FOR_YOU_RIGHT.map((item) => <FeedTile key={item.key} item={item} width={colW} />)}
        </View>
      </View>
    </ScrollView>
  )
}

function Header({ credits, loading }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image source={asset('/chapcam-mark.png')} style={styles.mark} accessibilityIgnoresInvertColors />
        <Text style={styles.brand}>ChapCam</Text>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.creditPill} accessibilityLabel={`${credits} crédits`}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.creditIcon}>
            <Ionicons name="flash" size={11} color={C.white} />
          </LinearGradient>
          <Text style={styles.creditText}>{loading ? '…' : credits}</Text>
        </View>
        <Pressable accessibilityLabel="Notifications" hitSlop={8} style={styles.bell}>
          <Ionicons name="notifications-outline" size={20} color={C.ink} />
          <View style={styles.bellDot} />
        </Pressable>
      </View>
    </View>
  )
}

function HeroCarousel({ width, onOpenTool }) {
  const [index, setIndex] = useState(0)
  const scroller = useRef(null)
  const cardW = width - PAD * 2
  const cardH = Math.round(cardW * 1.12)

  useEffect(() => {
    const id = setTimeout(() => {
      const next = (index + 1) % HERO_SLIDES.length
      scroller.current?.scrollTo({ x: next * width, animated: true })
      setIndex(next)
    }, 5000)
    return () => clearTimeout(id)
  }, [width, index])

  return (
    <View style={styles.heroWrap}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
      >
        {HERO_SLIDES.map((slide) => (
          <View key={slide.key} style={[styles.heroPage, { width }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={slide.cta}
              onPress={() => onOpenTool(slide.tool)}
              style={({ pressed }) => [styles.hero, { height: cardH }, pressed && styles.pressed]}
            >
              <Image source={asset(slide.image)} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.35)', 'rgba(11,18,51,0.92)']}
                locations={[0.35, 0.6, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroEyebrow}>
                {slide.key === 'live' ? <View style={styles.liveDot} /> : <Ionicons name="sparkles" size={11} color={C.white} />}
                <Text style={styles.heroEyebrowText}>{slide.eyebrow}</Text>
              </View>
              <View style={styles.heroBody}>
                <Text style={styles.heroTitle}>{slide.title}</Text>
                <View style={styles.heroCta}>
                  <Text style={styles.heroCtaText}>{slide.cta}</Text>
                  <View style={styles.heroCtaArrow}>
                    <Ionicons name="arrow-forward" size={14} color={C.white} />
                  </View>
                </View>
              </View>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dots}>
        {HERO_SLIDES.map((slide, i) => (
          <View key={slide.key} style={[styles.dotItem, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  )
}

function QuickActions({ onOpenTool }) {
  return (
    <View style={styles.quickRow}>
      {QUICK_ACTIONS.map((action) => (
        <Pressable
          key={action.key}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          onPress={() => onOpenTool(action.key)}
          style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
        >
          <LinearGradient colors={action.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quickIcon}>
            <Ionicons name={action.icon} size={20} color={C.white} />
          </LinearGradient>
          <Text style={styles.quickLabel} numberOfLines={1}>{action.label}</Text>
          <Text style={styles.quickHint} numberOfLines={1}>{action.hint}</Text>
        </Pressable>
      ))}
    </View>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={`Voir tout : ${title}`} style={styles.seeAll}>
        <Ionicons name="arrow-forward" size={16} color={C.ink} />
      </Pressable>
    </View>
  )
}

const TREND_W = 156

function TrendCard({ item }) {
  return (
    <Pressable accessibilityLabel={item.title} style={({ pressed }) => [styles.trend, pressed && styles.pressed]}>
      <Image source={asset(item.image)} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.9)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.trendTag}><Text style={styles.trendTagText}>{item.tag}</Text></View>
      <View style={styles.trendBody}>
        <Text style={styles.trendTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.trendMeta}>
          <Ionicons name="flame" size={11} color="#FFB36B" />
          <Text style={styles.trendMetaText}>{item.uses} créations</Text>
        </View>
      </View>
    </Pressable>
  )
}

function FeedTile({ item, width }) {
  return (
    <Pressable
      accessibilityLabel={item.title}
      style={({ pressed }) => [styles.tile, { width, height: Math.round(width * item.ratio) }, pressed && styles.pressed]}
    >
      <Image source={asset(item.image)} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.85)']} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.tilePlay}><Ionicons name="play" size={11} color={C.white} /></View>
      <View style={styles.tileBody}>
        <Text style={styles.tileTag}>{item.tag}</Text>
        <Text style={styles.tileTitle} numberOfLines={2}>{item.title}</Text>
      </View>
    </Pressable>
  )
}

const TAB_TITLES = { create: 'Créer', creations: 'Mes créations', profile: 'Mon profil' }

function PendingScreen({ tab, user, credits, plan, loading }) {
  const planName = plan ? plan.replace(/[-_]/g, ' ') : null
  return (
    <View style={styles.pending}>
      <Text style={styles.pendingTitle}>{TAB_TITLES[tab]}</Text>
      {tab === 'profile' ? (
        <View style={styles.profileCard}>
          <Text style={styles.profileEmail}>{user.email}</Text>
          <Text style={styles.profileMeta}>
            {loading ? 'Chargement…' : `${planName || 'Aucun forfait actif'} · ${credits} crédits`}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => supabase.auth.signOut()} style={styles.signOut}>
            <Ionicons name="log-out-outline" size={18} color="#E5484D" />
            <Text style={styles.signOutText}>Se déconnecter</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.pendingCopy}>Cet écran arrive dans la prochaine étape.</Text>
      )}
    </View>
  )
}

const TABS = [
  { key: 'home', label: 'Accueil', icon: 'home', iconOff: 'home-outline' },
  { key: 'explore', label: 'Explorer', icon: 'compass', iconOff: 'compass-outline' },
  { key: 'create' },
  { key: 'creations', label: 'Créations', icon: 'albums', iconOff: 'albums-outline' },
  { key: 'profile', label: 'Profil', icon: 'person', iconOff: 'person-outline' },
]

function TabBar({ tab, onChange, bottom }) {
  return (
    <View style={[styles.tabWrap, { paddingBottom: Math.max(bottom, 12) }]} pointerEvents="box-none">
      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((t) => {
          if (t.key === 'create') {
            return (
              <Pressable key={t.key} accessibilityRole="button" accessibilityLabel="Créer" onPress={() => onChange('create')} style={styles.tabItem}>
                <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.create}>
                  <Ionicons name="add" size={26} color={C.white} />
                </LinearGradient>
              </Pressable>
            )
          }
          const active = tab === t.key
          return (
            <Pressable
              key={t.key}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: active }}
              onPress={() => onChange(t.key)}
              style={styles.tabItem}
            >
              <Ionicons name={active ? t.icon : t.iconOff} size={21} color={active ? C.ink : C.muted} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>{t.label}</Text>
              <View style={[styles.tabIndicator, active && styles.tabIndicatorActive]} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  content: { paddingBottom: 132 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD, height: 52 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 30, height: 30, borderRadius: 9 },
  brand: { color: C.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingLeft: 4, paddingRight: 12, borderRadius: 17, backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  creditIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  creditText: { color: C.ink, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bell: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B6B', borderWidth: 1.5, borderColor: C.white },

  heroWrap: { marginTop: 6 },
  heroPage: { paddingHorizontal: PAD },
  hero: { borderRadius: 28, overflow: 'hidden', backgroundColor: INK_DEEP, justifyContent: 'flex-end', ...shadow, shadowOpacity: 0.22 },
  heroEyebrow: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(11,18,51,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B6B' },
  heroEyebrowText: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroBody: { padding: 20, gap: 16 },
  heroTitle: { color: C.white, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1.1 },
  heroCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 10, height: 46, paddingLeft: 18, paddingRight: 5, borderRadius: 23, backgroundColor: C.white },
  heroCtaText: { color: C.ink, fontSize: 14, fontWeight: '800' },
  heroCtaArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dotItem: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9D3EA' },
  dotActive: { width: 20, backgroundColor: C.blue },

  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: PAD, marginTop: 18 },
  quick: { flex: 1, backgroundColor: C.white, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: C.line, gap: 2, ...shadow, shadowOpacity: 0.06 },
  quickIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickLabel: { color: C.ink, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  quickHint: { color: C.muted, fontSize: 11, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: PAD, marginTop: 30, marginBottom: 14 },
  sectionTitle: { color: C.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  sectionSubtitle: { color: C.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  seeAll: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },

  trendRow: { paddingHorizontal: PAD, gap: GAP },
  trend: { width: TREND_W, height: Math.round(TREND_W * 1.42), borderRadius: 22, overflow: 'hidden', backgroundColor: INK_DEEP },
  trendTag: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 9, height: 22, justifyContent: 'center', borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.92)' },
  trendTagText: { color: C.ink, fontSize: 10, fontWeight: '800' },
  trendBody: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 4 },
  trendTitle: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  trendMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendMetaText: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '600' },

  feed: { flexDirection: 'row', gap: GAP, paddingHorizontal: PAD },
  feedCol: { gap: GAP },
  tile: { borderRadius: 22, overflow: 'hidden', backgroundColor: INK_DEEP },
  tilePlay: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(11,18,51,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  tileBody: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  tileTag: { color: '#BFD3FF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  tileTitle: { color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },

  pending: { flex: 1, paddingHorizontal: PAD, paddingTop: 16 },
  pendingTitle: { color: C.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  pendingCopy: { color: C.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  profileCard: { backgroundColor: C.white, borderRadius: 22, padding: 18, marginTop: 16, borderWidth: 1, borderColor: C.line, gap: 6 },
  profileEmail: { color: C.ink, fontSize: 16, fontWeight: '800' },
  profileMeta: { color: C.muted, fontSize: 14, textTransform: 'capitalize' },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 10 },
  signOutText: { color: '#E5484D', fontSize: 15, fontWeight: '700' },

  tabWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  tabBar: { flexDirection: 'row', alignItems: 'center', height: 66, borderRadius: 33, backgroundColor: 'rgba(255,255,255,0.98)', borderWidth: 1, borderColor: C.line, paddingHorizontal: 6, ...shadow, shadowOpacity: 0.16 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: '100%' },
  tabLabel: { fontSize: 10, fontWeight: '600', color: C.muted },
  tabLabelActive: { color: C.ink, fontWeight: '800' },
  tabIndicator: { width: 4, height: 4, borderRadius: 2, marginTop: 1, backgroundColor: 'transparent' },
  tabIndicatorActive: { backgroundColor: C.blue },
  create: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', ...shadow, shadowColor: C.blue, shadowOpacity: 0.4 },
})
