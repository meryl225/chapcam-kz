import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { BRAND, C, GAP, PAD, asset, shadow } from '../ui/catalog'
import { ExploreScreen } from '../screens/ExploreScreen'
import { LiveSwapScreen } from '../screens/LiveSwapScreen'
import { CreateScreen } from '../screens/CreateScreen'
import { CreationsScreen } from '../screens/CreationsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'

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
    cta: 'Explorer les outils',
    image: '/swap/poster-photo-video.png',
    tool: 'explore',
  },
  {
    key: 'image',
    eyebrow: 'Studio IA',
    title: 'Portraits\nde cinéma.',
    cta: 'Explorer les outils',
    image: '/dashboard/hero-avatar.jpg',
    tool: 'explore',
  },
]

const AVAILABLE_TOOLS = new Set(['live'])

const QUICK_ACTIONS = [
  { key: 'live', label: 'Live Swap', hint: 'Temps réel', icon: 'videocam', colors: ['#FF3B6B', '#FF7A45'] },
  { key: 'image', label: 'Image IA', hint: 'Texte en image', icon: 'image', colors: [C.blue, '#3FA2FF'] },
  { key: 'video', label: 'Vidéo IA', hint: 'Photo en vidéo', icon: 'film', colors: [C.violet, '#B06BFF'] },
]

const TRENDS = [
  { key: 't1', title: 'Visage cinéma', tag: 'Live Swap', tool: 'live', image: '/images/hero/avatars/a1.png' },
  { key: 't2', title: 'Portrait animé', tag: 'Genjutsu', tool: 'genjutsu', image: '/images/hero/avatars/a3.png' },
  { key: 't3', title: 'Néon studio', tag: 'Motion', tool: 'motion', image: '/images/hero/avatars/a4.png' },
  { key: 't4', title: 'Voix off pro', tag: 'Vocal', tool: 'voice', image: '/images/hero/avatars/a5.png' },
  { key: 't5', title: 'Style éditorial', tag: 'Live Swap', tool: 'live', image: '/images/hero/avatars/a6.png' },
]

const FOR_YOU = [
  { key: 'f1', title: 'Photo en vidéo', tag: 'Image en vidéo', tool: 'genjutsu', video: true, image: '/swap/poster-photo-video.png' },
  { key: 'f2', title: 'Avant / après', tag: 'Live Swap', tool: 'live', video: true, image: '/swap/face-original.png' },
  { key: 'f3', title: 'Avatar en mouvement', tag: 'Genjutsu', tool: 'genjutsu', video: true, image: '/images/hero/avatars/a2.png' },
  { key: 'f4', title: 'Motion 3D', tag: 'Motion Control', tool: 'motion', video: true, image: '/swap/poster-motion.png' },
]

const R_CARD = 22
const R_HERO = 26

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
    if (key === 'live') setOpenTool('live')
    else setTab('explore')
  }

  if (openTool === 'live') {
    return <LiveSwapScreen onBack={() => setOpenTool(null)} topInset={insets.top} bottomInset={insets.bottom} />
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {tab === 'home' ? (
        <HomeScreen
          user={user}
          credits={subscription ? credits : null}
          loading={loading}
          onNavigate={setTab}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onOpenTool={onOpenTool}
        />
      ) : tab === 'explore' ? (
        <ExploreScreen onOpenTool={onOpenTool} />
      ) : tab === 'create' ? (
        <CreateScreen onOpenTool={onOpenTool} />
      ) : tab === 'creations' ? (
        <CreationsScreen onCreate={() => setTab('create')} />
      ) : tab === 'profile' ? (
        <ProfileScreen user={user} subscription={subscription} loading={loading} refreshing={refreshing} onRefresh={onRefresh} />
      ) : (
        <PendingScreen tab={tab} user={user} credits={credits} plan={subscription?.plan} loading={loading} />
      )}
      <TabBar tab={tab} onChange={setTab} bottom={insets.bottom} />
    </View>
  )
}

function HomeScreen({ user, credits, loading, refreshing, onRefresh, onOpenTool, onNavigate }) {
  const { width } = useWindowDimensions()
  const colW = (width - PAD * 2 - GAP) / 2
  const goExplore = () => onNavigate('explore')

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
    >
      <Header user={user} credits={credits} loading={loading} onOpenProfile={() => onNavigate('profile')} />
      <HeroCarousel width={width} onOpenTool={onOpenTool} />
      <QuickActions onOpenTool={onOpenTool} />

      <SectionHeader title="Tendances" subtitle="Les effets du moment" onSeeAll={goExplore} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.trendRow}
        decelerationRate="fast"
        snapToInterval={TREND_W + GAP}
      >
        {TRENDS.map((item) => <TrendCard key={item.key} item={item} onPress={() => onOpenTool(item.tool)} />)}
      </ScrollView>

      <SectionHeader title="Pour toi" subtitle="Des idées à recréer" onSeeAll={goExplore} />
      <View style={styles.feed}>
        {FOR_YOU.map((item) => (
          <FeedTile key={item.key} item={item} width={colW} onPress={() => onOpenTool(item.tool)} />
        ))}
      </View>
    </ScrollView>
  )
}

function Header({ user, credits, loading, onOpenProfile }) {
  const initial = (user?.email?.[0] || 'C').toUpperCase()
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Image source={asset('/chapcam-mark.png')} style={styles.mark} accessibilityIgnoresInvertColors />
        <Text style={styles.brand}>ChapCam</Text>
      </View>
      <View style={styles.headerActions}>
        {!loading && credits !== null ? (
          <View style={styles.creditPill} accessible accessibilityLabel={`${credits} crédits disponibles`}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.creditIcon}>
              <Ionicons name="flash" size={11} color={C.white} />
            </LinearGradient>
            <Text style={styles.creditText}>{credits}</Text>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Mon profil" hitSlop={8} onPress={onOpenProfile}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  )
}

function HeroCarousel({ width, onOpenTool }) {
  const [index, setIndex] = useState(0)
  const scroller = useRef(null)
  const cardW = width - PAD * 2
  const cardH = Math.round(Math.min(cardW * 1.02, 400))

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
      {QUICK_ACTIONS.map((action) => {
        const enabled = AVAILABLE_TOOLS.has(action.key)
        return (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.hint}
            accessibilityState={{ disabled: !enabled }}
            disabled={!enabled}
            onPress={() => onOpenTool(action.key)}
            style={({ pressed }) => [styles.quick, pressed && styles.pressed]}
          >
            <View style={styles.quickTop}>
              <LinearGradient
                colors={action.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.quickIcon, !enabled && styles.quickIconOff]}
              >
                <Ionicons name={action.icon} size={18} color={C.white} />
              </LinearGradient>
              {enabled ? (
                <View style={styles.quickGo}><Ionicons name="arrow-forward" size={12} color={C.white} /></View>
              ) : (
                <Ionicons name="lock-closed" size={13} color={C.muted} />
              )}
            </View>
            <View>
              <Text style={styles.quickLabel} numberOfLines={1}>{action.label}</Text>
              <Text style={styles.quickHint} numberOfLines={1}>{action.hint}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

function SectionHeader({ title, subtitle, onSeeAll }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <Pressable
        hitSlop={10}
        onPress={onSeeAll}
        accessibilityRole="button"
        accessibilityLabel={`Voir tout : ${title}`}
        style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
      >
        <Text style={styles.seeAllText}>Tout voir</Text>
        <Ionicons name="chevron-forward" size={14} color={C.blue} />
      </Pressable>
    </View>
  )
}

const TREND_W = 148

function TrendCard({ item, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.tag}`}
      onPress={onPress}
      style={({ pressed }) => [styles.trend, pressed && styles.pressed]}
    >
      <Image source={asset(item.image)} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.88)']} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.trendTag}>
        {item.tool === 'live' ? <View style={styles.liveDot} /> : null}
        <Text style={styles.trendTagText}>{item.tag}</Text>
      </View>
      <View style={styles.trendBody}>
        <Text style={styles.trendTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardGo}><Ionicons name="arrow-forward" size={12} color={C.white} /></View>
      </View>
    </Pressable>
  )
}

function FeedTile({ item, width, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.tag}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { width, height: Math.round(width * 1.28) }, pressed && styles.pressed]}
    >
      <Image source={asset(item.image)} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(11,18,51,0)', 'rgba(11,18,51,0.85)']} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
      {item.video ? <View style={styles.tilePlay}><Ionicons name="play" size={10} color={C.white} /></View> : null}
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
              <Pressable key={t.key} accessibilityRole="button" accessibilityLabel="Créer" accessibilityState={{ selected: tab === 'create' }} onPress={() => onChange('create')} style={styles.tabItem}>
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
  content: { paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD, height: 50 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 28, height: 28, borderRadius: 8 },
  brand: { color: C.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingLeft: 4, paddingRight: 11, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  creditIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  creditText: { color: C.ink, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: C.white, fontSize: 14, fontWeight: '800' },

  heroWrap: { marginTop: 4 },
  heroPage: { paddingHorizontal: PAD },
  hero: { borderRadius: R_HERO, overflow: 'hidden', backgroundColor: INK_DEEP, justifyContent: 'flex-end', ...shadow, shadowOpacity: 0.22 },
  heroEyebrow: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(11,18,51,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B6B' },
  heroEyebrowText: { color: C.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
  heroBody: { padding: 18, gap: 14 },
  heroTitle: { color: C.white, fontSize: 30, lineHeight: 33, fontWeight: '900', letterSpacing: -1 },
  heroCta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 10, height: 44, paddingLeft: 16, paddingRight: 4, borderRadius: 22, backgroundColor: C.white },
  heroCtaText: { color: C.ink, fontSize: 14, fontWeight: '800' },
  heroCtaArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dotItem: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C9D3EA' },
  dotActive: { width: 18, backgroundColor: C.blue },

  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: PAD, marginTop: 14 },
  quick: { flex: 1, height: 104, justifyContent: 'space-between', backgroundColor: C.white, borderRadius: R_CARD, padding: 12, borderWidth: 1, borderColor: C.line, ...shadow, shadowOpacity: 0.06 },
  quickTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  quickIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  quickIconOff: { opacity: 0.55 },
  quickGo: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: C.ink, fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  quickHint: { color: C.muted, fontSize: 11, fontWeight: '600', marginTop: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingHorizontal: PAD, marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: C.ink, fontSize: 21, fontWeight: '900', letterSpacing: -0.6 },
  sectionSubtitle: { color: C.muted, fontSize: 13, fontWeight: '600', marginTop: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 2 },
  seeAllText: { color: C.blue, fontSize: 13, fontWeight: '700' },

  trendRow: { paddingHorizontal: PAD, gap: GAP },
  trend: { width: TREND_W, height: Math.round(TREND_W * 1.36), borderRadius: R_CARD, overflow: 'hidden', backgroundColor: INK_DEEP },
  trendTag: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.94)' },
  trendTagText: { color: C.ink, fontSize: 10, fontWeight: '800' },
  trendBody: { position: 'absolute', left: 12, right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  trendTitle: { flex: 1, color: C.white, fontSize: 15, fontWeight: '800', letterSpacing: -0.3 },
  cardGo: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },

  feed: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: PAD },
  tile: { borderRadius: R_CARD, overflow: 'hidden', backgroundColor: INK_DEEP },
  tilePlay: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(11,18,51,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
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
