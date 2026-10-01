import React, { useCallback, useEffect, useState } from 'react'
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#F5F8FF',
  ink: '#0E1530',
  muted: '#7A84A0',
  line: '#E6EBF5',
  blue: '#1E6BFF',
  violet: '#7B4DFF',
  white: '#FFFFFF',
}
const BRAND = [C.blue, C.violet]
const PAD = 18
const GAP = 12

const asset = (path) => ({ uri: `https://chapcam.com${path}` })

const TOOLS = [
  { key: 'live', title: 'Live Swap', copy: 'Change de visage en temps réel', image: '/swap/face-transformed.png', live: true },
  { key: 'genjutsu', title: 'Genjutsu', copy: 'Anime tes images avec un mouvement naturel', image: '/images/hero/avatars/a2.png' },
  { key: 'motion', title: 'Motion Control', copy: 'Anime ta photo en 3D', image: '/swap/poster-motion.png' },
  { key: 'translate', title: 'Traduction vidéo', copy: 'Traduis ta vidéo en 180+ langues', image: '/swap/poster-video-translation.png' },
  { key: 'voice', title: 'Message Vocal', copy: 'Crée des voix réalistes depuis un texte', image: '/swap/poster-message-vocal.png' },
  { key: 'verify', title: 'ChapVerify', copy: 'Détecte les deepfakes', image: '/swap/poster-chapverify.png' },
]

const TRENDS = [
  { key: 't1', title: 'Visage cinéma', tag: 'Live Swap', image: '/images/hero/avatars/a1.png' },
  { key: 't2', title: 'Portrait animé', tag: 'Genjutsu', image: '/images/hero/avatars/a3.png' },
  { key: 't3', title: 'Néon studio', tag: 'Motion', image: '/images/hero/avatars/a4.png' },
  { key: 't4', title: 'Voix off pro', tag: 'Vocal', image: '/images/hero/avatars/a5.png' },
  { key: 't5', title: 'Style éditorial', tag: 'Live Swap', image: '/images/hero/avatars/a6.png' },
]

const FOR_YOU = [
  { key: 'f1', title: 'Transforme une photo en vidéo', tag: 'Image en vidéo', image: '/swap/poster-photo-video.png', tall: true },
  { key: 'f2', title: 'Avant / après en direct', tag: 'Live Swap', image: '/swap/face-original.png' },
  { key: 'f3', title: 'Ton avatar en mouvement', tag: 'Genjutsu', image: '/dashboard/hero-avatar.jpg' },
]

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
  const planName = subscription?.plan ? subscription.plan.replace(/[-_]/g, ' ') : null
  const onRefresh = () => { setRefreshing(true); loadAccount() }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {tab === 'home' ? (
        <HomeScreen credits={credits} planName={planName} loading={loading} refreshing={refreshing} onRefresh={onRefresh} />
      ) : (
        <PendingScreen tab={tab} user={user} credits={credits} planName={planName} loading={loading} />
      )}
      <TabBar tab={tab} onChange={setTab} bottom={insets.bottom} />
    </View>
  )
}

function HomeScreen({ credits, planName, loading, refreshing, onRefresh }) {
  const { width } = useWindowDimensions()
  const cardW = (width - PAD * 2 - GAP) / 2
  const [lang, setLang] = useState('FR')

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
    >
      <View style={styles.topbar}>
        <View style={styles.brandRow}>
          <Image source={asset('/chapcam-mark.png')} style={styles.mark} accessibilityIgnoresInvertColors />
          <Text style={styles.brand}>ChapCam</Text>
        </View>
        <View style={styles.topActions}>
          <View style={styles.langSwitch} accessibilityRole="radiogroup" accessibilityLabel="Langue">
            {['FR', 'EN'].map((code) => (
              <Pressable
                key={code}
                onPress={() => setLang(code)}
                accessibilityRole="radio"
                accessibilityState={{ selected: lang === code }}
                style={[styles.langItem, lang === code && styles.langItemActive]}
              >
                <Text style={[styles.langText, lang === code && styles.langTextActive]}>{code}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityLabel="Notifications" hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="notifications-outline" size={22} color={C.ink} />
            <View style={styles.dot} />
          </Pressable>
        </View>
      </View>

      <LinearGradient colors={['#E4EEFF', '#EFE7FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <Image source={asset('/dashboard/hero-avatar.jpg')} style={styles.heroImage} />
        <LinearGradient
          colors={['#E4EEFF', 'rgba(228,238,255,0.85)', 'rgba(228,238,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.heroFade}
        />
        <View style={styles.heroBody}>
          <View style={styles.creditChip}>
            <Ionicons name="sparkles" size={12} color={C.violet} />
            <Text style={styles.creditChipText}>
              {loading ? 'Chargement…' : `${credits} crédits${planName ? ` · ${planName}` : ''}`}
            </Text>
          </View>
          <Text style={styles.heroTitle}>
            Crée sans{'\n'}
            <Text style={styles.heroTitleAccent}>limites.</Text>
          </Text>
          <Text style={styles.heroCopy}>Transforme tes images, vidéos et ta voix avec des outils IA professionnels.</Text>
          <Pressable accessibilityRole="button" style={({ pressed }) => [pressed && styles.pressed]}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              <Text style={styles.ctaText}>Commencer maintenant</Text>
              <Ionicons name="arrow-forward" size={14} color={C.white} />
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            placeholder="Rechercher un outil, un effet, une idée…"
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            returnKeyType="search"
            accessibilityLabel="Rechercher"
          />
        </View>
        <Pressable accessibilityLabel="Filtres" style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={C.ink} />
        </Pressable>
      </View>

      <SectionHeader title="Outils IA" action="Tout voir" />
      <View style={styles.grid}>
        {TOOLS.map((tool) => <ToolCard key={tool.key} tool={tool} width={cardW} />)}
      </View>

      <SectionHeader title="Tendances" action="Voir plus" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
        style={styles.bleed}
        decelerationRate="fast"
        snapToInterval={148 + GAP}
      >
        {TRENDS.map((item) => (
          <Pressable key={item.key} accessibilityLabel={item.title} style={({ pressed }) => [styles.trend, pressed && styles.pressed]}>
            <Image source={asset(item.image)} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={['rgba(14,21,48,0)', 'rgba(14,21,48,0.85)']} style={styles.shade} />
            <View style={styles.trendTag}><Text style={styles.trendTagText}>{item.tag}</Text></View>
            <Text style={styles.trendTitle} numberOfLines={2}>{item.title}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionHeader title="Pour toi" />
      <View style={styles.forYou}>
        <MediaTile item={FOR_YOU[0]} width={cardW} height={cardW * 1.5 + GAP} />
        <View style={styles.forYouCol}>
          <MediaTile item={FOR_YOU[1]} width={cardW} height={cardW * 0.75} />
          <MediaTile item={FOR_YOU[2]} width={cardW} height={cardW * 0.75} />
        </View>
      </View>
    </ScrollView>
  )
}

function SectionHeader({ title, action }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionActionText}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={C.blue} />
        </Pressable>
      ) : null}
    </View>
  )
}

function ToolCard({ tool, width }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tool.title}. ${tool.copy}`}
      style={({ pressed }) => [styles.tool, { width, height: width * 1.02 }, pressed && styles.pressed]}
    >
      <Image source={asset(tool.image)} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(30,20,90,0)', 'rgba(16,14,60,0.92)']} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
      {tool.live ? <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View> : null}
      <View style={styles.toolFooter}>
        <View style={styles.flex}>
          <Text style={styles.toolTitle} numberOfLines={1}>{tool.title}</Text>
          <Text style={styles.toolCopy} numberOfLines={2}>{tool.copy}</Text>
        </View>
        <View style={styles.toolArrow}><Ionicons name="arrow-forward" size={13} color={C.ink} /></View>
      </View>
    </Pressable>
  )
}

function MediaTile({ item, width, height }) {
  return (
    <Pressable accessibilityLabel={item.title} style={({ pressed }) => [styles.media, { width, height }, pressed && styles.pressed]}>
      <Image source={asset(item.image)} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(14,21,48,0)', 'rgba(14,21,48,0.85)']} style={styles.shade} />
      <View style={styles.mediaBody}>
        <Text style={styles.mediaTag}>{item.tag}</Text>
        <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
      </View>
      <View style={styles.play}><Ionicons name="play" size={12} color={C.white} /></View>
    </Pressable>
  )
}

const TAB_TITLES = { explore: 'Explorer', create: 'Créer', creations: 'Mes créations', profile: 'Mon profil' }

function PendingScreen({ tab, user, credits, planName, loading }) {
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
  { key: 'creations', label: 'Mes créations', icon: 'albums', iconOff: 'albums-outline' },
  { key: 'profile', label: 'Profil', icon: 'person', iconOff: 'person-outline' },
]

function TabBar({ tab, onChange, bottom }) {
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(bottom, 10) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        if (t.key === 'create') {
          return (
            <Pressable key={t.key} accessibilityRole="button" accessibilityLabel="Créer" onPress={() => onChange('create')} style={styles.createWrap}>
              <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.create}>
                <Ionicons name="add" size={30} color={C.white} />
              </LinearGradient>
            </Pressable>
          )
        }
        const active = tab === t.key
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(t.key)}
            style={styles.tabItem}
          >
            <Ionicons name={active ? t.icon : t.iconOff} size={22} color={active ? C.blue : C.muted} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const shadow = {
  shadowColor: '#2A3A7A',
  shadowOpacity: 0.12,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 8 },
  elevation: 4,
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  content: { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 120 },

  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, marginBottom: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 32, height: 32, borderRadius: 10 },
  brand: { color: C.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  langSwitch: { flexDirection: 'row', backgroundColor: C.white, borderRadius: 999, padding: 3, borderWidth: 1, borderColor: C.line },
  langItem: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  langItemActive: { backgroundColor: '#E8F0FF' },
  langText: { fontSize: 12, fontWeight: '700', color: C.muted },
  langTextActive: { color: C.blue },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line },
  dot: { position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B5C', borderWidth: 1.5, borderColor: C.white },

  hero: { height: 236, borderRadius: 24, overflow: 'hidden', ...shadow },
  heroImage: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%', height: '100%', resizeMode: 'cover' },
  heroFade: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '78%' },
  heroBody: { flex: 1, padding: 20, justifyContent: 'center', maxWidth: '64%' },
  creditChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, marginBottom: 10 },
  creditChipText: { fontSize: 11, fontWeight: '700', color: C.ink, textTransform: 'capitalize' },
  heroTitle: { color: C.ink, fontSize: 34, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  heroTitleAccent: { color: C.blue },
  heroCopy: { color: '#4C5878', fontSize: 13, lineHeight: 18, marginTop: 8 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 16, height: 40, borderRadius: 999, marginTop: 14 },
  ctaText: { color: C.white, fontWeight: '800', fontSize: 13 },

  searchRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  search: { flex: 1, height: 48, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink },
  filterBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: C.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { color: C.blue, fontSize: 14, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tool: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#1A1F45', ...shadow },
  live: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF2D55', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.white },
  liveText: { color: C.white, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  toolFooter: { position: 'absolute', left: 12, right: 10, bottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  toolTitle: { color: C.white, fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  toolCopy: { color: 'rgba(255,255,255,0.82)', fontSize: 11, lineHeight: 14, marginTop: 2 },
  toolArrow: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },

  bleed: { marginHorizontal: -PAD },
  carousel: { paddingHorizontal: PAD, gap: GAP },
  trend: { width: 148, height: 196, borderRadius: 20, overflow: 'hidden', backgroundColor: '#1A1F45', justifyContent: 'flex-end', padding: 12 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  trendTag: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  trendTagText: { color: C.ink, fontSize: 10, fontWeight: '800' },
  trendTitle: { color: C.white, fontSize: 14, fontWeight: '800' },

  forYou: { flexDirection: 'row', gap: GAP },
  forYouCol: { gap: GAP },
  media: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#1A1F45', ...shadow },
  mediaBody: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  mediaTag: { color: '#BFD3FF', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  mediaTitle: { color: C.white, fontSize: 14, fontWeight: '800', marginTop: 2 },
  play: { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(14,21,48,0.55)', alignItems: 'center', justifyContent: 'center' },

  pending: { flex: 1, paddingHorizontal: PAD, paddingTop: 16 },
  pendingTitle: { color: C.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.6 },
  pendingCopy: { color: C.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  profileCard: { backgroundColor: C.white, borderRadius: 22, padding: 18, marginTop: 16, borderWidth: 1, borderColor: C.line, gap: 6 },
  profileEmail: { color: C.ink, fontSize: 16, fontWeight: '800' },
  profileMeta: { color: C.muted, fontSize: 14, textTransform: 'capitalize' },
  signOut: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 10 },
  signOutText: { color: '#E5484D', fontSize: 15, fontWeight: '700' },

  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.97)', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, paddingHorizontal: 6 },
  tabItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600', color: C.muted },
  tabLabelActive: { color: C.blue, fontWeight: '800' },
  createWrap: { flex: 1, alignItems: 'center' },
  create: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginTop: -26, borderWidth: 4, borderColor: C.white, ...shadow, shadowColor: C.blue, shadowOpacity: 0.35 },
})
