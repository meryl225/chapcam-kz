import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, AppState, FlatList, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { Image } from 'expo-image'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { AI_CONSENT_KEY, AiDataConsentSheet, hasAiDataConsent } from '../ui/AiDataConsent'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Notifications from 'expo-notifications'
import { supabase } from '../lib/supabase'
import { creationIdFromResponse, registerForPushNotifications, unregisterPushToken } from '../lib/pushNotifications'
import { getUserAvatarSource, resolveAvatarUrl } from '../lib/userAvatar'
import { fetchAccountSummary } from '../lib/accountSummary'
import { BRAND, C, COMING_SOON_TOOLS, CREATOR_VIDEOS, GAP, PAD, TOOL_MEDIA, asset, shadow } from '../ui/catalog'
import { MediaView } from '../ui/ToolMedia'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { ChapCamBrand } from '../ui/ChapCamBrand'
import { ExploreScreen } from '../screens/ExploreScreen'
import { LiveSwapScreen } from '../screens/LiveSwapScreen'
import { PhotoVideoScreen } from '../screens/PhotoVideoScreen'
import { VoiceMessageScreen } from '../screens/VoiceMessageScreen'
import { GenjutsuScreen } from '../screens/GenjutsuScreen'
import { MotionControlScreen } from '../screens/MotionControlScreen'
import { VideoTranslationScreen } from '../screens/VideoTranslationScreen'
import { ChapVerifyScreen } from '../screens/ChapVerifyScreen'
import { CreateScreen } from '../screens/CreateScreen'
import { CreationsScreen } from '../screens/CreationsScreen'
import { ProfileScreen } from '../screens/ProfileScreen'
import { AccountDetailScreen } from '../screens/AccountDetailScreen'
import { SubscriptionPlansScreen } from '../screens/SubscriptionPlansScreen'
import { TokenPacksScreen } from '../screens/TokenPacksScreen'
import { LiveSwapMinutesScreen } from '../screens/LiveSwapMinutesScreen'
import { PlansPreviewScreen } from '../screens/PlansPreviewScreen'
import { QuickLaunchMenu } from '../ui/QuickLaunchMenu'

const INK_DEEP = '#0B1233'
const JETONS_LOGO = require('../../assets/jetons-logo.png')

const HERO_SLIDES = [
  {
    key: 'live',
    eyebrow: 'En direct',
    title: 'Change de visage\nen temps réel.',
    cta: 'Lancer Live Swap',
    media: TOOL_MEDIA.live,
    tool: 'live',
  },
  {
    key: 'video',
    eyebrow: 'Photos en Vidéo',
    title: 'Donne vie\nà tes photos.',
    cta: 'Explorer les outils',
    media: TOOL_MEDIA['photo-video'],
    tool: 'explore',
  },
  {
    key: 'image',
    eyebrow: 'Genjutsu',
    title: 'Portraits\nde cinéma.',
    cta: 'Explorer les outils',
    media: TOOL_MEDIA.genjutsu,
    tool: 'explore',
  },
]

const NATIVE_TOOLS = new Set(['live', 'photo-video', 'genjutsu', 'motion', 'translate', 'voice', 'verify'])
const AVAILABLE_TOOLS = NATIVE_TOOLS

const QUICK_ACTIONS = [
  { key: 'live', label: 'Live Swap', hint: 'Temps réel', icon: 'videocam', colors: ['#FF3B6B', '#FF7A45'] },
  { key: 'genjutsu', label: 'Genjutsu', hint: 'Anime tes images', icon: 'sparkles', colors: [C.blue, '#3FA2FF'] },
  { key: 'photo-video', label: 'Photos en Vidéo', hint: 'Anime ta photo en vidéo', icon: 'film', colors: [C.violet, '#B06BFF'] },
]

const TRENDS = [
  { key: 't1', title: 'Visage cinéma', tag: 'Live Swap', tool: 'live', media: TOOL_MEDIA.live },
  { key: 't2', title: 'Portrait animé', tag: 'Genjutsu', tool: 'genjutsu', media: TOOL_MEDIA.genjutsu },
  { key: 't3', title: 'Néon studio', tag: 'Motion', tool: 'motion', media: TOOL_MEDIA.motion },
  { key: 't4', title: 'Voix off pro', tag: 'Message Vocal', tool: 'voice', media: TOOL_MEDIA.voice },
]

const R_CARD = 22
const R_HERO = 26

// Same guard as ToolMedia: older dev clients without the expo-video native module fall back to posters.
const videoModule = requireOptionalNativeModule('ExpoVideo') ? require('expo-video') : null
const IMAGE_TRANSITION_MS = 150
const TREND_VIEWABILITY = { itemVisiblePercentThreshold: 80 }

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
  const [quickOpen, setQuickOpen] = useState(false)
  const [accountDetail, setAccountDetail] = useState(null)
  const [plansOpen, setPlansOpen] = useState(false)
  const [tokensOpen, setTokensOpen] = useState(false)
  const [minutesOpen, setMinutesOpen] = useState(false)
  const [plansPreviewOpen, setPlansPreviewOpen] = useState(false)
  const [notifiedCreationId, setNotifiedCreationId] = useState(null)
  const notificationResponse = Notifications.useLastNotificationResponse()

  useEffect(() => {
    registerForPushNotifications().catch(() => {})
  }, [user.id])

  // Covers taps while running, in background, and the cold start after a tap.
  useEffect(() => {
    const creationId = creationIdFromResponse(notificationResponse)
    if (!creationId) return
    setOpenTool(null)
    setPlansOpen(false)
    setTokensOpen(false)
    setMinutesOpen(false)
    setPlansPreviewOpen(false)
    setAccountDetail(null)
    setQuickOpen(false)
    setTab('creations')
    setNotifiedCreationId(creationId)
    Notifications.clearLastNotificationResponseAsync().catch(() => {})
  }, [notificationResponse])

  const clearNotifiedCreation = useCallback(() => setNotifiedCreationId(null), [])

  // Same source as the Profile balance (Neon jetons_wallets via /api/mobile/account-summary).
  // A failed reload keeps the last real value instead of showing 0.
  const [jetons, setJetons] = useState(null)
  const [jetonsLoading, setJetonsLoading] = useState(true)
  const [summaryAvatarUrl, setSummaryAvatarUrl] = useState(undefined)
  const loadJetons = useCallback(async () => {
    try {
      const summary = await fetchAccountSummary()
      setJetons(summary.jetons)
      if ('avatar_url' in summary) setSummaryAvatarUrl(summary.avatar_url)
    } catch {
      // keep the previous balance
    } finally {
      setJetonsLoading(false)
    }
  }, [])

  const loadAccount = useCallback(async () => {
    const subscriptionQuery = supabase
      .from('subscriptions')
      .select('plan,status,points,expires_at,end_date,is_active')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle()
    try {
      const [, { data }] = await Promise.all([loadJetons(), subscriptionQuery])
      setSubscription(data || null)
    } catch {
      // keep the previous subscription
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user.id, loadJetons])

  useEffect(() => { loadAccount() }, [loadAccount])

  // Generations debit jetons inside the tool screens: refetch when coming back to Home or to the app.
  const backOnHome = tab === 'home' && !openTool
  useEffect(() => { if (backOnHome) loadJetons() }, [backOnHome, loadJetons])
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') loadJetons() })
    return () => sub.remove()
  }, [loadJetons])

  const subscriptionEnd = subscription?.expires_at || subscription?.end_date
  const subscriptionExpired = Boolean(subscriptionEnd) && new Date(subscriptionEnd).getTime() < Date.now()
  const credits = subscriptionExpired ? 0 : Math.max(0, Number(subscription?.points) || 0)
  const onRefresh = useCallback(() => { setRefreshing(true); loadAccount() }, [loadAccount])

  const [aiConsented, setAiConsented] = useState(() => Platform.OS !== 'ios' || hasAiDataConsent(user))
  const [consentPromptOpen, setConsentPromptOpen] = useState(() => Platform.OS === 'ios' && !hasAiDataConsent(user))
  const [pendingTool, setPendingTool] = useState(null)

  const onOpenTool = useCallback((key) => {
    if (COMING_SOON_TOOLS.has(key)) return
    if (!NATIVE_TOOLS.has(key)) {
      setTab('explore')
      return
    }
    // Only reached if the user declined the one-time prompt on the home screen.
    if (!aiConsented) {
      setQuickOpen(false)
      setPendingTool(key)
      setConsentPromptOpen(true)
      return
    }
    setOpenTool(key)
  }, [aiConsented])

  const declineAiConsent = () => {
    setConsentPromptOpen(false)
    setPendingTool(null)
  }

  const acceptAiConsent = async () => {
    const { error } = await supabase.auth.updateUser({ data: { [AI_CONSENT_KEY]: new Date().toISOString() } })
    if (error) {
      Alert.alert('Erreur', 'Impossible d’enregistrer votre accord. Vérifiez votre connexion et réessayez.')
      return
    }
    setAiConsented(true)
    setConsentPromptOpen(false)
    const key = pendingTool
    setPendingTool(null)
    if (key) setOpenTool(key)
  }

  const onQuickLaunch = onOpenTool

  // Tabs stay mounted once visited so switching back does not refetch and re-show loaders.
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['home']))
  useEffect(() => {
    setVisitedTabs((prev) => (prev.has(tab) ? prev : new Set(prev).add(tab)))
  }, [tab])

  let overlay = null
  if (plansOpen) {
    const closePlans = () => {
      setPlansOpen(false)
      loadAccount()
    }
    overlay = <SubscriptionPlansScreen user={user} onBack={closePlans} onPurchased={loadAccount} />
  } else if (plansPreviewOpen) {
    overlay = <PlansPreviewScreen onBack={() => setPlansPreviewOpen(false)} />
  } else if (tokensOpen) {
    const closeTokens = () => {
      setTokensOpen(false)
      loadAccount()
    }
    overlay = <TokenPacksScreen user={user} onBack={closeTokens} onPurchased={loadAccount} />
  } else if (minutesOpen) {
    const closeMinutes = () => {
      setMinutesOpen(false)
      loadAccount()
    }
    overlay = <LiveSwapMinutesScreen user={user} onBack={closeMinutes} onPurchased={loadAccount} />
  } else if (accountDetail) {
    overlay = <AccountDetailScreen type={accountDetail} onBack={() => setAccountDetail(null)} subscription={subscription} user={user} />
  } else if (openTool === 'live') {
    // The Live Swap debits subscriptions.points: refetch so Home and Profile show the new balance.
    const closeLiveSwap = () => {
      setOpenTool(null)
      loadAccount()
    }
    const openPlansFromLive = () => {
      setOpenTool(null)
      setPlansOpen(true)
    }
    overlay = <LiveSwapScreen onBack={closeLiveSwap} onOpenPlans={openPlansFromLive} topInset={insets.top} bottomInset={insets.bottom} subscription={loading ? undefined : subscription} />
  } else if (openTool === 'photo-video') {
    overlay = <PhotoVideoScreen onBack={() => setOpenTool(null)} />
  } else if (openTool === 'voice') {
    overlay = <VoiceMessageScreen onBack={() => setOpenTool(null)} />
  } else if (openTool === 'genjutsu') {
    overlay = <GenjutsuScreen onBack={() => setOpenTool(null)} onOpenCreations={() => { setOpenTool(null); setTab('creations') }} topInset={insets.top} />
  } else if (openTool === 'motion') {
    overlay = <MotionControlScreen onBack={() => setOpenTool(null)} onOpenCreations={() => { setOpenTool(null); setTab('creations') }} topInset={insets.top} />
  } else if (openTool === 'translate') {
    overlay = <VideoTranslationScreen onBack={() => setOpenTool(null)} />
  } else if (openTool === 'verify') {
    overlay = <ChapVerifyScreen onBack={() => setOpenTool(null)} topInset={insets.top} />
  }

  const tabPane = (key, content) =>
    visitedTabs.has(key) || tab === key ? (
      <View key={key} style={[styles.tabPane, tab !== key && styles.hidden]}>
        {content}
      </View>
    ) : null

  const isKnownTab = ['home', 'explore', 'create', 'creations', 'profile'].includes(tab)

  return (
    <View style={styles.root}>
      <View style={[styles.root, { paddingTop: insets.top }, overlay && styles.hidden]}>
        {tabPane('home', (
          <HomeScreen
            user={user}
            jetons={jetons}
            jetonsLoading={jetonsLoading}
            avatarUrl={summaryAvatarUrl}
            onNavigate={setTab}
            refreshing={refreshing}
            onRefresh={onRefresh}
            onOpenTool={onOpenTool}
            visible={tab === 'home' && !overlay}
          />
        ))}
        {tabPane('explore', <ExploreScreen onOpenTool={onOpenTool} />)}
        {tabPane('create', <CreateScreen onOpenTool={onOpenTool} />)}
        {tabPane('creations', (
          <CreationsScreen onCreate={() => setQuickOpen(true)} openCreationId={notifiedCreationId} onOpenedCreation={clearNotifiedCreation} />
        ))}
        {tabPane('profile', (
          <ProfileScreen user={user} subscription={subscription} loading={loading} refreshing={refreshing} onRefresh={onRefresh} onOpenAccountDetail={setAccountDetail} onOpenPlans={() => setPlansOpen(true)} onOpenTokens={() => setTokensOpen(true)} onOpenMinutes={() => setMinutesOpen(true)} />
        ))}
        {!isKnownTab ? (
          <PendingScreen tab={tab} user={user} credits={credits} plan={subscription?.plan} loading={loading} />
        ) : null}
        <TabBar tab={tab} onChange={(key) => (key === 'create' ? setQuickOpen(true) : setTab(key))} bottom={insets.bottom} />
        <QuickLaunchMenu visible={quickOpen && !overlay} bottom={insets.bottom} onClose={() => setQuickOpen(false)} onSelect={onQuickLaunch} />
      </View>
      {overlay ? <View style={StyleSheet.absoluteFill}>{overlay}</View> : null}
      <AiDataConsentSheet visible={consentPromptOpen} onAccept={acceptAiConsent} onDecline={declineAiConsent} />
    </View>
  )
}

const HomeScreen = memo(function HomeScreen({ user, jetons, jetonsLoading, avatarUrl, refreshing, onRefresh, onOpenTool, onNavigate, visible }) {
  const { width } = useWindowDimensions()
  const colW = useMemo(() => (width - PAD * 2 - GAP) / 2, [width])
  const goExplore = useCallback(() => onNavigate('explore'), [onNavigate])
  const openProfile = useCallback(() => onNavigate('profile'), [onNavigate])
  const refreshControl = useMemo(
    () => <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />,
    [refreshing, onRefresh],
  )

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <Header user={user} jetons={jetons} jetonsLoading={jetonsLoading} avatarUrl={avatarUrl} onOpenProfile={openProfile} />
      <HeroCarousel width={width} onOpenTool={onOpenTool} />
      <QuickActions onOpenTool={onOpenTool} />

      <SectionHeader title="Tendances" subtitle="Les effets du moment" onSeeAll={goExplore} />
      <TrendsList onOpenTool={onOpenTool} visible={visible} />

      <SectionHeader title="Pour toi" subtitle="Des idées à recréer" onSeeAll={goExplore} />
      <View style={styles.feed}>
        {CREATOR_VIDEOS.map((item) => (
          <CreatorTile key={item.key} item={item} width={colW} />
        ))}
      </View>
    </ScrollView>
  )
})

const Header = memo(function Header({ user, jetons, jetonsLoading, avatarUrl, onOpenProfile }) {
  const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || null
  const initial = ((metaName || user?.email || '').trim().charAt(0) || 'C').toUpperCase()
  const photoUrl = resolveAvatarUrl(avatarUrl, user)
  const [failedUrl, setFailedUrl] = useState(null)
  const [loadedUrl, setLoadedUrl] = useState(null)
  const hasPhoto = Boolean(photoUrl && failedUrl !== photoUrl)
  return (
    <View style={styles.header}>
      <ChapCamBrand />
      <View style={styles.headerActions}>
        {jetons !== null ? (
          <View style={styles.creditPill} accessible accessibilityLabel={`${jetons} jetons disponibles`}>
            <View style={styles.creditIcon}>
              <Image source={JETONS_LOGO} style={styles.creditIconImage} contentFit="contain" cachePolicy="memory-disk" accessibilityIgnoresInvertColors />
            </View>
            <Text style={styles.creditText}>{jetons.toLocaleString('fr-FR')}</Text>
          </View>
        ) : jetonsLoading ? (
          <View style={[styles.creditPill, styles.creditSkeleton]} accessible accessibilityLabel="Chargement des jetons" />
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Mon profil" hitSlop={8} onPress={onOpenProfile}>
          {/* The photo sits beside the gradient (not inside it): remote images nested in the native gradient view stay blank on iOS. */}
          <View style={styles.avatar}>
            <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            {hasPhoto && loadedUrl === photoUrl ? null : <Text style={styles.avatarText}>{initial}</Text>}
            <Image
              key={hasPhoto ? photoUrl : 'default'}
              source={hasPhoto ? { uri: photoUrl } : getUserAvatarSource(user)}
              style={styles.avatarPhoto}
              contentFit={hasPhoto ? 'cover' : 'contain'}
              cachePolicy="memory-disk"
              transition={IMAGE_TRANSITION_MS}
              onLoad={() => { if (hasPhoto) setLoadedUrl(photoUrl) }}
              onError={() => { if (hasPhoto) setFailedUrl(photoUrl) }}
              accessibilityIgnoresInvertColors
            />
          </View>
        </Pressable>
      </View>
    </View>
  )
})

const HeroCarousel = memo(function HeroCarousel({ width, onOpenTool }) {
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
              <MediaView media={slide.media} />
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
})

const QuickActions = memo(function QuickActions({ onOpenTool }) {
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
})

const SectionHeader = memo(function SectionHeader({ title, subtitle, onSeeAll }) {
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
})

const TREND_W = 148
const TREND_STEP = TREND_W + GAP
const trendKeyExtractor = (item) => item.key
const getTrendLayout = (_, index) => ({ length: TREND_STEP, offset: PAD + TREND_STEP * index, index })
const TrendSeparator = () => <View style={styles.trendSeparator} />

const TrendsList = memo(function TrendsList({ onOpenTool, visible }) {
  const [activeKey, setActiveKey] = useState(TRENDS[0].key)
  // FlatList requires a callback that never changes identity.
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    const first = viewableItems.find((v) => v.isViewable)
    if (first) setActiveKey(first.key)
  }).current

  const renderItem = useCallback(
    ({ item }) => <TrendCard item={item} onOpenTool={onOpenTool} playing={visible && item.key === activeKey} />,
    [onOpenTool, visible, activeKey],
  )

  return (
    <FlatList
      horizontal
      data={TRENDS}
      keyExtractor={trendKeyExtractor}
      renderItem={renderItem}
      extraData={activeKey}
      getItemLayout={getTrendLayout}
      ItemSeparatorComponent={TrendSeparator}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      removeClippedSubviews
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.trendRow}
      decelerationRate="fast"
      snapToInterval={TREND_STEP}
      viewabilityConfig={TREND_VIEWABILITY}
      onViewableItemsChanged={onViewableItemsChanged}
    />
  )
})

function TrendVideo({ src, playing, label }) {
  const source = useMemo(() => (typeof src === 'string' ? asset(src).uri : src), [src])
  const player = videoModule.useVideoPlayer(source, (p) => {
    p.loop = true
    p.muted = true
  })
  useEffect(() => {
    if (playing) player.play()
    else player.pause()
  }, [playing, player])
  return (
    <videoModule.VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsPictureInPicture={false}
      accessibilityLabel={label}
    />
  )
}

// Only the visible card decodes video; the others show their poster (or a paused first frame when the asset has no poster).
const TrendMedia = memo(function TrendMedia({ media, playing, label }) {
  const isVideo = media?.type === 'video' && videoModule
  const still = media?.type === 'image' ? media.src : media?.poster
  return (
    <View style={[StyleSheet.absoluteFill, styles.mediaPlaceholder]} pointerEvents="none">
      {isVideo && (playing || !still) ? (
        <TrendVideo src={media.src} playing={playing} label={label} />
      ) : still ? (
        <Image
          source={asset(still)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={IMAGE_TRANSITION_MS}
          accessibilityLabel={label}
        />
      ) : null}
    </View>
  )
})

const TrendCard = memo(function TrendCard({ item, onOpenTool, playing }) {
  const onPress = useCallback(() => onOpenTool(item.tool), [onOpenTool, item.tool])
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.tag}`}
      onPress={onPress}
      style={({ pressed }) => [styles.trend, pressed && styles.pressed]}
    >
      <TrendMedia media={item.media} playing={playing} />
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
})

const CreatorTile = memo(function CreatorTile({ item, width }) {
  return (
    <View style={[styles.tile, { width, height: Math.round(width * 1.28) }]}>
      <MediaView media={item.media} />
    </View>
  )
})

const TAB_TITLES = { create: 'Créer', creations: 'Mes créations', profile: 'Mon profil' }

function PendingScreen({ tab, user, credits, plan, loading }) {
  const planName = plan ? plan.replace(/[-_]/g, ' ') : null
  return (
    <View style={styles.pending}>
      <Text style={styles.pendingTitle}>{TAB_TITLES[tab]}</Text>
      {tab === 'profile' ? (
        <View style={styles.profileCard}>
          <Text style={styles.profileEmail}>{user.email}</Text>
          {loading ? (
            <ChapCamLoader size="small" style={{ alignSelf: 'flex-start' }} />
          ) : (
            <Text style={styles.profileMeta}>{`${planName || 'Aucun forfait actif'} · ${credits} crédits`}</Text>
          )}
          <Pressable accessibilityRole="button" onPress={async () => { await unregisterPushToken(); supabase.auth.signOut() }} style={styles.signOut}>
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
  tabPane: { flex: 1 },
  hidden: { display: 'none' },
  flex: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  content: { paddingBottom: 120 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: PAD, height: 64 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingLeft: 4, paddingRight: 11, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  // The coin fills ~78% of the square artwork: a light 28px render puts the whole coin edge just inside the 24px circle.
  creditIcon: { width: 24, height: 24, borderRadius: 12, overflow: 'hidden', backgroundColor: '#0B0F5C' },
  creditIconImage: { position: 'absolute', top: -2.5, left: -2, width: 28, height: 28 },
  creditText: { color: C.ink, fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  // Explicit size, same as the Profile avatar: remote images with absoluteFill stay blank on iOS.
  avatarPhoto: { position: 'absolute', top: 0, left: 0, width: 32, height: 32, borderRadius: 16 },
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

  creditSkeleton: { width: 58, backgroundColor: C.line },
  trendRow: { paddingHorizontal: PAD },
  trendSeparator: { width: GAP },
  mediaPlaceholder: { backgroundColor: '#1A1F45' },
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
