import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActionSheetIOS,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { requireOptionalNativeModule } from 'expo-modules-core'
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { BRAND, C, GAP, PAD, shadow } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { API_URL } from '../lib/api'
import { AiBadge, ReportAbuseSheet } from '../ui/Safety'

// Native modules are optional so an older dev build without them still runs:
// the affected action falls back instead of crashing.
const video = requireOptionalNativeModule('ExpoVideo') ? require('expo-video') : null
const fileSystem = requireOptionalNativeModule('FileSystem') ? require('expo-file-system') : null
// SDK 57: the root `expo-media-library` export of saveToLibraryAsync is a stub
// that always throws; the working implementation lives in `/legacy`.
const mediaLibrary = requireOptionalNativeModule('ExpoMediaLibrary') ? require('expo-media-library/legacy') : null


// Exact production tools stored in video_history (lib/video-history.ts VideoTool).
const TOOL_META = {
  photo_video: { label: 'Photos en Vidéo', icon: 'image', kind: 'video' },
  motion: { label: 'Motion', icon: 'body', kind: 'video' },
  translation: { label: 'Traduction de Vidéo', icon: 'language', kind: 'video' },
  genjutsu: { label: 'Genjutsu', icon: 'sparkles', kind: 'video' },
}
const KIND_FILTERS = [
  { key: 'video', label: 'Vidéos' },
  { key: 'image', label: 'Images' },
  { key: 'audio', label: 'Audio' },
]

const metaFor = (item) => TOOL_META[item.tool] || { label: 'Création', icon: 'film', kind: 'video' }
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d)
}
const formatDuration = (s) => {
  if (!Number.isFinite(s) || s <= 0) return ''
  const total = Math.round(s)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('auth')
  return { Authorization: `Bearer ${token}` }
}

async function fetchCreations() {
  const url = `${API_URL}/api/mobile/creations`
  let res = await fetch(url, { headers: await authHeader() })
  if (res.status === 401) {
    const refreshed = await supabase.auth.refreshSession()
    const token = refreshed.data?.session?.access_token
    if (!token) throw new Error('auth')
    res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  }
  if (res.status === 401) throw new Error('auth')
  if (!res.ok) throw new Error('http')
  const json = await res.json()
  return Array.isArray(json?.creations) ? json.creations : []
}

async function deleteCreation(id) {
  const res = await fetch(`${API_URL}/api/videos/history`, {
    method: 'DELETE',
    headers: { ...(await authHeader()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  if (!res.ok) throw new Error('delete')
}

const errorText = (e) => (e?.message === 'unsupported' ? 'Mets à jour l’application pour utiliser cette action.' : e?.message || String(e))

// The player streams `item.playback_url`: a signed R2 MP4 URL (1 h) from
// /api/mobile/creations. The list may be older than that, so a freshly signed
// URL for the same creation is requested first; the stored one is the fallback.
async function downloadToCache(item) {
  if (!fileSystem) throw new Error('unsupported')
  const { File, Paths } = fileSystem

  const candidates = []
  try {
    const fresh = (await fetchCreations()).find((creation) => creation.id === item.id)
    if (fresh?.playback_url) candidates.push(fresh.playback_url)
  } catch {
    // Offline refresh: fall back to the URL the player is already using.
  }
  if (item.playback_url && !candidates.includes(item.playback_url)) candidates.push(item.playback_url)
  if (candidates.length === 0) throw new Error('Aucune URL vidéo pour cette création.')

  let lastError = null
  for (const url of candidates) {
    if (/\.m3u8(\?|$)/i.test(url)) {
      lastError = new Error('Vidéo disponible uniquement en streaming (HLS) : aucun fichier MP4 à télécharger.')
      continue
    }
    const target = new File(Paths.cache, `chapcam-${item.tool}-${String(item.id).slice(0, 8)}.mp4`)
    if (target.exists) target.delete()
    try {
      const file = await File.downloadFileAsync(url, target, { idempotent: true })
      const size = file?.size ?? 0
      if (file?.exists && size >= 1024) return file.uri
      lastError = new Error(`Fichier reçu invalide (${size} octets).`)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}

async function saveVideoToPhotos(uri) {
  if (!mediaLibrary) throw new Error('unsupported')
  let perm = await mediaLibrary.getPermissionsAsync(true)
  if (!perm.granted && perm.canAskAgain !== false) perm = await mediaLibrary.requestPermissionsAsync(true)
  if (!perm.granted) return false

  // iOS can reject saveToLibraryAsync for downloaded MP4s with an opaque
  // native error. createAssetAsync uses the Photos import path and correctly
  // registers video assets in the library.
  try {
    await mediaLibrary.createAssetAsync(uri)
    return true
  } catch (assetError) {
    try {
      await mediaLibrary.saveToLibraryAsync(uri)
      return true
    } catch {
      throw assetError
    }
  }
}

export function CreationsScreen({ onCreate, openCreationId, onOpenedCreation }) {
  const { width } = useWindowDimensions()
  const cardW = (width - PAD * 2 - GAP) / 2
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [kind, setKind] = useState('all')
  const [tool, setTool] = useState('all')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(async () => {
    try {
      setItems(await fetchCreations())
      setError(null)
    } catch (e) {
      setError(e?.message === 'auth' ? 'auth' : 'network')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Opened from a push: the list may predate the completion, so refetch once
  // before giving up on finding the notified creation.
  const refetchedForId = useRef(null)
  useEffect(() => {
    if (!openCreationId || !items) return
    const target = items.find((i) => String(i.id) === openCreationId)
    if (target?.status === 'completed' && target.playback_url) {
      setViewing(target)
      onOpenedCreation?.()
    } else if (refetchedForId.current !== openCreationId) {
      refetchedForId.current = openCreationId
      load()
    } else {
      onOpenedCreation?.()
    }
  }, [openCreationId, items, load, onOpenedCreation])

  const hasProcessing = !!items?.some((i) => i.status === 'processing')
  useEffect(() => {
    if (!hasProcessing) return
    const t = setInterval(load, 15000)
    return () => clearInterval(t)
  }, [hasProcessing, load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const kinds = useMemo(() => {
    const present = new Set((items || []).map((i) => metaFor(i).kind))
    return KIND_FILTERS.filter((k) => present.has(k.key))
  }, [items])

  const tools = useMemo(() => {
    const present = new Set((items || []).map((i) => i.tool))
    return Object.keys(TOOL_META).filter((k) => present.has(k))
  }, [items])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (items || []).filter((i) => {
      const meta = metaFor(i)
      if (kind !== 'all' && meta.kind !== kind) return false
      if (tool !== 'all' && i.tool !== tool) return false
      if (!q) return true
      return `${i.title || ''} ${meta.label}`.toLowerCase().includes(q)
    })
  }, [items, kind, tool, query])

  const runDownload = async (item) => {
    setBusy({ id: item.id, action: 'download' })
    let uri
    try {
      uri = await downloadToCache(item)
    } catch (e) {
      Alert.alert('Téléchargement impossible', errorText(e))
      setBusy(null)
      return
    }
    try {
      if (!mediaLibrary) {
        await Share.share({ url: uri })
        return
      }
      if (await saveVideoToPhotos(uri)) {
        Alert.alert('Vidéo enregistrée dans Photos')
      } else {
        Alert.alert('Accès à Photos refusé', 'Autorise ChapCam à ajouter des vidéos dans Réglages > ChapCam > Photos.', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Réglages', onPress: () => Linking.openSettings() },
        ])
      }
    } catch (e) {
      Alert.alert('Enregistrement dans Photos impossible', errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const runShare = async (item) => {
    setBusy({ id: item.id, action: 'share' })
    try {
      const uri = await downloadToCache(item)
      await Share.share({ url: uri })
    } catch (e) {
      Alert.alert('Partage impossible', errorText(e))
    } finally {
      setBusy(null)
    }
  }

  const runDelete = (item) => {
    Alert.alert('Supprimer cette création ?', 'Le fichier sera définitivement supprimé de ton compte.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setBusy({ id: item.id, action: 'delete' })
          try {
            await deleteCreation(item.id)
            setItems((prev) => (prev || []).filter((i) => i.id !== item.id))
            setViewing((v) => (v?.id === item.id ? null : v))
          } catch {
            Alert.alert('Suppression impossible', 'Réessaie dans un instant.')
          } finally {
            setBusy(null)
          }
        },
      },
    ])
  }

  const openActions = (item) => {
    const ready = item.status === 'completed'
    const options = ready ? ['Télécharger', 'Partager', 'Supprimer', 'Annuler'] : ['Supprimer', 'Annuler']
    const handlers = ready ? [runDownload, runShare, runDelete] : [runDelete]
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: options.length - 2, title: item.title?.trim() || metaFor(item).label },
        (i) => handlers[i]?.(item),
      )
    } else {
      Alert.alert(item.title?.trim() || metaFor(item).label, undefined, [
        ...handlers.map((h, i) => ({ text: options[i], style: options[i] === 'Supprimer' ? 'destructive' : 'default', onPress: () => h(item) })),
        { text: 'Annuler', style: 'cancel' },
      ])
    }
  }

  const open = (item) => {
    if (item.status === 'completed' && item.playback_url) setViewing(item)
  }

  const filtersActive = tool !== 'all'
  const ready = items && items.length > 0

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.titleCol}>
          <Text style={styles.title} accessibilityRole="header">Mes créations</Text>
          {ready ? <Text style={styles.subtitle}>{items.length === 1 ? '1 création' : `${items.length} créations`}</Text> : null}
        </View>
        {ready ? (
          <View style={styles.headerActions}>
            <IconButton icon={searchOpen ? 'close' : 'search'} label={searchOpen ? 'Fermer la recherche' : 'Rechercher'} onPress={() => { setSearchOpen((o) => !o); if (searchOpen) setQuery('') }} />
            {tools.length > 1 ? <IconButton icon="options-outline" label="Filtrer par outil" active={filtersActive} onPress={() => setFilterOpen(true)} /> : null}
          </View>
        ) : null}
      </View>

      {ready && searchOpen ? (
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={C.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une création"
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Rechercher une création"
          />
        </View>
      ) : null}

      {ready && kinds.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
          {[{ key: 'all', label: 'Toutes' }, ...kinds].map((f) => (
            <Chip key={f.key} label={f.label} active={kind === f.key} onPress={() => setKind(f.key)} />
          ))}
        </ScrollView>
      ) : null}

      {filtersActive ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retirer le filtre" onPress={() => setTool('all')} style={styles.activeFilter}>
          <Ionicons name={TOOL_META[tool]?.icon || 'film'} size={13} color={C.blue} />
          <Text style={styles.activeFilterText}>{TOOL_META[tool]?.label}</Text>
          <Ionicons name="close" size={14} color={C.blue} />
        </Pressable>
      ) : null}
    </View>
  )

  if (items === null && !error) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={[styles.flex, styles.center]}>
          <ChapCamLoader size="large" />
        </View>
      </View>
    )
  }

  if (error && items === null) {
    return (
      <View style={styles.flex}>
        {header}
        <StateBlock
          icon={error === 'auth' ? 'lock-closed-outline' : 'cloud-offline-outline'}
          title={error === 'auth' ? 'Session expirée' : 'Connexion impossible'}
          copy={error === 'auth' ? 'Reconnecte-toi pour retrouver tes créations.' : 'Vérifie ta connexion puis réessaie.'}
          cta={error === 'auth' ? 'Se reconnecter' : 'Réessayer'}
          onPress={error === 'auth' ? () => supabase.auth.signOut() : onRefresh}
        />
      </View>
    )
  }

  const noResults = ready && visible.length === 0

  return (
    <>
      <FlatList
        data={visible}
        keyExtractor={(i) => String(i.id)}
        numColumns={2}
        ListHeaderComponent={header}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
        ListEmptyComponent={
          noResults ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={22} color={C.muted} />
              <Text style={styles.noResultsText}>Aucune création ne correspond.</Text>
            </View>
          ) : (
            <EmptyState onPress={onCreate} />
          )
        }
        renderItem={({ item }) => (
          <CreationCard
            item={item}
            width={cardW}
            busy={busy?.id === item.id}
            onPress={() => open(item)}
            onMore={() => openActions(item)}
          />
        )}
      />

      <ToolFilterSheet
        visible={filterOpen}
        tools={tools}
        value={tool}
        onClose={() => setFilterOpen(false)}
        onChange={(k) => {
          setTool(k)
          setFilterOpen(false)
        }}
      />

      <Viewer
        item={viewing}
        busy={busy && viewing && busy.id === viewing.id ? busy.action : null}
        onClose={() => setViewing(null)}
        onDownload={runDownload}
        onShare={runShare}
        onDelete={runDelete}
      />
    </>
  )
}

function IconButton({ icon, label, onPress, active }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} style={({ pressed }) => [styles.iconBtn, active && styles.iconBtnActive, pressed && styles.pressed]}>
      <Ionicons name={icon} size={19} color={active ? C.white : C.ink} />
    </Pressable>
  )
}

function Chip({ label, active, onPress }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

const CreationCard = React.memo(function CreationCard({ item, width, busy, onPress, onMore }) {
  const meta = metaFor(item)
  const [broken, setBroken] = useState(false)
  const playable = item.status === 'completed' && !!item.playback_url
  const title = item.title?.trim() || meta.label
  const date = formatDate(item.created_at)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta.label}${date ? `, ${date}` : ''}`}
      accessibilityHint="Appui long pour plus d’options"
      onPress={onPress}
      onLongPress={onMore}
      delayLongPress={300}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { height: width * 1.25 }]}>
        {item.thumbnail_url && !broken ? (
          <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBroken(true)} fadeDuration={150} />
        ) : (
          <LinearGradient colors={['#E9EFFF', '#F1EBFF']} style={[StyleSheet.absoluteFill, styles.center]}>
            <Ionicons name={meta.icon} size={28} color={C.violet} />
          </LinearGradient>
        )}
        <LinearGradient colors={['rgba(14,21,48,0)', 'rgba(14,21,48,0.55)']} style={styles.thumbShade} pointerEvents="none" />
        <View style={styles.kindBadge}>
          <Ionicons name="videocam" size={11} color={C.white} />
          <Text style={styles.kindBadgeText}>Vidéo · IA</Text>
        </View>
        {item.status === 'processing' ? (
          <View style={[styles.overlay, styles.center]}>
            <ChapCamLoader size="small" tone="light" />
            <Text style={styles.overlayText}>En cours</Text>
          </View>
        ) : item.status === 'failed' ? (
          <View style={[styles.overlay, styles.center]}>
            <Ionicons name="alert-circle" size={20} color={C.white} />
            <Text style={styles.overlayText}>Échec</Text>
          </View>
        ) : playable ? (
          <View style={styles.play}>
            <Ionicons name="play" size={13} color={C.ink} />
          </View>
        ) : null}
        {busy ? (
          <View style={[styles.overlay, styles.center]}>
            <ChapCamLoader tone="light" />
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.cardMeta}>
            <Ionicons name={meta.icon} size={11} color={C.violet} />
            <Text style={styles.cardTool} numberOfLines={1}>{meta.label}</Text>
          </View>
          {date ? <Text style={styles.cardDate}>{date}</Text> : null}
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Options pour ${title}`} hitSlop={10} onPress={onMore} style={styles.more}>
          <Ionicons name="ellipsis-horizontal" size={16} color={C.muted} />
        </Pressable>
      </View>
    </Pressable>
  )
})

function ToolFilterSheet({ visible, tools, value, onClose, onChange }) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Filtrer par outil</Text>
        {['all', ...tools].map((k) => {
          const active = value === k
          const meta = k === 'all' ? { label: 'Tous les outils', icon: 'apps' } : TOOL_META[k]
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onChange(k)} style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}>
              <View style={[styles.sheetIcon, active && styles.sheetIconActive]}>
                <Ionicons name={meta.icon} size={16} color={active ? C.white : C.blue} />
              </View>
              <Text style={[styles.sheetLabel, active && styles.sheetLabelActive]}>{meta.label}</Text>
              {active ? <Ionicons name="checkmark" size={18} color={C.blue} /> : null}
            </Pressable>
          )
        })}
      </View>
    </Modal>
  )
}

// A full-screen Modal is a separate iOS window: it needs its own provider,
// otherwise the close button lands under the status bar / Dynamic Island where
// touches never reach it.
function Viewer({ item, ...props }) {
  if (!item) return null
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose} statusBarTranslucent>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar style="light" />
        <ViewerContent key={item.id} item={item} {...props} />
      </SafeAreaProvider>
    </Modal>
  )
}

function ViewerContent({ item, busy, onClose, onDownload, onShare, onDelete }) {
  const insets = useSafeAreaInsets()
  const [duration, setDuration] = useState(0)
  const [reporting, setReporting] = useState(false)
  const meta = metaFor(item)
  const title = item.title?.trim() || meta.label
  const date = formatDate(item.created_at)
  const durationLabel = formatDuration(duration)
  return (
      <View style={styles.viewer}>
        <View style={[styles.viewerTop, { paddingTop: insets.top + 8 }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer le lecteur" hitSlop={12} onPress={onClose} style={({ pressed }) => [styles.viewerClose, pressed && styles.dim]}>
            <Ionicons name="chevron-back" size={22} color={C.white} />
          </Pressable>
          <View style={styles.viewerHead}>
            <Text style={styles.viewerTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.viewerSub} numberOfLines={1}>{[meta.label, date, durationLabel].filter(Boolean).join(' · ')}</Text>
          </View>
          <AiBadge tone="dark" />
        </View>

        <View style={styles.viewerStage}>
          {video ? (
            <FullVideo uri={item.playback_url} poster={item.thumbnail_url} onDuration={setDuration} />
          ) : item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={title} />
          ) : null}
        </View>

        <View style={[styles.viewerBar, { paddingBottom: insets.bottom + 14 }]}>
          <ViewerAction icon="arrow-down-circle-outline" label="Télécharger" loading={busy === 'download'} disabled={!!busy} onPress={() => onDownload(item)} />
          <ViewerAction icon="share-outline" label="Partager" loading={busy === 'share'} disabled={!!busy} onPress={() => onShare(item)} />
          <ViewerAction icon="trash-outline" label="Supprimer" danger loading={busy === 'delete'} disabled={!!busy} onPress={() => onDelete(item)} />
          <ViewerAction icon="flag-outline" label="Signaler" disabled={!!busy} onPress={() => setReporting(true)} />
        </View>
        <ReportAbuseSheet visible={reporting} onClose={() => setReporting(false)} contentUrl={item.playback_url} context={`Mes créations · ${meta.label}`} />
      </View>
  )
}

function FullVideo({ uri, poster, onDuration }) {
  const player = video.useVideoPlayer(uri, (p) => {
    p.loop = false
    p.play()
  })
  const reported = useRef(false)
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay' && !reported.current) {
        reported.current = true
        onDuration(player.duration)
      }
    })
    return () => sub.remove()
  }, [player, onDuration])
  return (
    <>
      {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="contain" blurRadius={0} /> : null}
      <video.VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls allowsFullscreen allowsPictureInPicture />
    </>
  )
}

function ViewerAction({ icon, label, onPress, loading, disabled, danger }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: loading }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.viewerAction, (pressed || (disabled && !loading)) && styles.dim]}>
      <View style={[styles.viewerActionIcon, danger && styles.viewerActionDanger]}>
        {loading ? <ChapCamLoader size="small" tone="light" /> : <Ionicons name={icon} size={22} color={C.white} />}
      </View>
      <Text style={styles.viewerActionText}>{label}</Text>
    </Pressable>
  )
}

function EmptyState({ onPress }) {
  return (
    <View style={styles.state}>
      <LinearGradient colors={['#E9EFFF', '#F1EBFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyArt}>
        <View style={styles.emptyFrameBack} />
        <View style={styles.emptyFrame}>
          <Ionicons name="play" size={22} color={C.blue} />
        </View>
      </LinearGradient>
      <Text style={styles.stateTitle}>Aucune création pour le moment</Text>
      <Text style={styles.stateCopy}>Tes vidéos générées avec les outils ChapCam apparaîtront ici.</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stateCta}>
          <Ionicons name="add" size={18} color={C.white} />
          <Text style={styles.stateCtaText}>Commencer à créer</Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

function StateBlock({ icon, title, copy, cta, onPress }) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={28} color={C.blue} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateCopy}>{copy}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stateCta}>
          <Text style={styles.stateCtaText}>{cta}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}

const VIEWER_BG = '#070B1A'

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  dim: { opacity: 0.55 },
  list: { paddingBottom: 120, flexGrow: 1 },
  header: { paddingHorizontal: PAD, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 8, gap: 12 },
  titleCol: { flex: 1 },
  title: { color: C.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: C.muted, fontSize: 14, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.05 },
  iconBtnActive: { backgroundColor: C.blue, borderColor: C.blue },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, height: 44, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: C.ink, fontSize: 15, fontWeight: '600', height: '100%' },
  chipsWrap: { marginTop: 14, marginHorizontal: -PAD },
  chips: { paddingHorizontal: PAD, gap: 8 },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: 999, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: C.ink, borderColor: C.ink },
  chipText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: C.white, fontWeight: '800' },
  activeFilter: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 12, height: 30, borderRadius: 15, backgroundColor: '#E9EFFF' },
  activeFilterText: { color: C.blue, fontSize: 13, fontWeight: '800' },
  row: { paddingHorizontal: PAD, gap: GAP, marginBottom: GAP },
  card: { backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...shadow, shadowOpacity: 0.07 },
  thumb: { backgroundColor: '#E9EFFF', overflow: 'hidden' },
  thumbShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%' },
  kindBadge: { position: 'absolute', top: 8, left: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: 'rgba(14,21,48,0.55)' },
  kindBadgeText: { color: C.white, fontSize: 11, fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,21,48,0.45)', gap: 6 },
  overlayText: { color: C.white, fontSize: 13, fontWeight: '800' },
  play: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 12, paddingRight: 4, paddingVertical: 10, gap: 4 },
  cardText: { flex: 1, gap: 3 },
  cardTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardTool: { color: C.violet, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  cardDate: { color: C.muted, fontSize: 12, fontWeight: '600' },
  more: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  noResults: { alignItems: 'center', paddingTop: 48, gap: 8 },
  noResultsText: { color: C.muted, fontSize: 15, fontWeight: '600' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: PAD * 2, paddingTop: 40, paddingBottom: 140, gap: 10 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E9EFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  emptyArt: { width: 132, height: 132, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyFrameBack: { position: 'absolute', width: 62, height: 78, borderRadius: 14, backgroundColor: 'rgba(123,77,255,0.18)', transform: [{ rotate: '-10deg' }, { translateX: -14 }] },
  emptyFrame: { width: 62, height: 78, borderRadius: 14, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '6deg' }, { translateX: 10 }], ...shadow, shadowOpacity: 0.12 },
  stateTitle: { color: C.ink, fontSize: 20, fontWeight: '900', letterSpacing: -0.4, textAlign: 'center' },
  stateCopy: { color: C.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 10 },
  stateCta: { flexDirection: 'row', gap: 6, height: 48, paddingHorizontal: 24, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  stateCtaText: { color: C.white, fontSize: 15, fontWeight: '800' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,21,48,0.35)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: PAD, paddingTop: 10 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 14 },
  sheetTitle: { color: C.ink, fontSize: 18, fontWeight: '900', marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, borderRadius: 14, paddingHorizontal: 6 },
  sheetRowPressed: { backgroundColor: C.bg },
  sheetIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#E9EFFF', alignItems: 'center', justifyContent: 'center' },
  sheetIconActive: { backgroundColor: C.blue },
  sheetLabel: { flex: 1, color: C.ink, fontSize: 16, fontWeight: '600' },
  sheetLabelActive: { fontWeight: '800' },
  viewer: { flex: 1, backgroundColor: VIEWER_BG },
  viewerTop: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: PAD, paddingBottom: 10, zIndex: 2, elevation: 2 },
  viewerClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  viewerHead: { flex: 1 },
  viewerTitle: { color: C.white, fontSize: 16, fontWeight: '800' },
  viewerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  viewerStage: { flex: 1 },
  viewerBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14, paddingHorizontal: PAD },
  viewerAction: { alignItems: 'center', gap: 6, minWidth: 84 },
  viewerActionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  viewerActionDanger: { backgroundColor: 'rgba(255,77,94,0.22)' },
  viewerActionText: { color: C.white, fontSize: 12, fontWeight: '700' },
})
