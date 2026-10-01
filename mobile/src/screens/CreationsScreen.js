import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'
import { BRAND, C, GAP, PAD, shadow } from '../ui/catalog'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? Constants.expoConfig?.extra?.apiUrl ?? 'https://chapcam.com').replace(/\/$/, '')

const TOOL_META = {
  photo_video: { label: 'Photo animée', icon: 'image' },
  motion: { label: 'Motion Control', icon: 'body' },
  translation: { label: 'Traduction vidéo', icon: 'language' },
  genjutsu: { label: 'Genjutsu', icon: 'sparkles' },
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (iso) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateFormatter.format(d)
}

async function fetchCreations() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('auth')
  const res = await fetch(`${API_URL}/api/mobile/creations`, { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) throw new Error('auth')
  if (!res.ok) throw new Error('http')
  const json = await res.json()
  return Array.isArray(json?.creations) ? json.creations : []
}

export function CreationsScreen({ onCreate }) {
  const { width } = useWindowDimensions()
  const cardW = (width - PAD * 2 - GAP) / 2
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async () => {
    try {
      const list = await fetchCreations()
      setItems(list)
      setError(null)
    } catch (e) {
      setError(e?.message === 'auth' ? 'auth' : 'network')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const filters = useMemo(() => {
    const present = new Set((items || []).map((i) => i.tool))
    return [{ key: 'all', label: 'Toutes' }, ...Object.keys(TOOL_META).filter((k) => present.has(k)).map((k) => ({ key: k, label: TOOL_META[k].label }))]
  }, [items])

  const visible = useMemo(() => (items || []).filter((i) => filter === 'all' || i.tool === filter), [items, filter])

  const open = (item) => {
    if (item.status !== 'completed' || !item.playback_url) return
    WebBrowser.openBrowserAsync(item.playback_url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET }).catch(() => {})
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.title} accessibilityRole="header">Mes créations</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Nouvelle création" onPress={onCreate} style={({ pressed }) => [pressed && styles.pressed]}>
          <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={C.white} />
          </LinearGradient>
        </Pressable>
      </View>
      {items && items.length > 0 ? (
        <>
          <Text style={styles.subtitle}>{items.length === 1 ? '1 création' : `${items.length} créations`}</Text>
          {filters.length > 2 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsWrap}>
              {filters.map((f) => {
                const active = filter === f.key
                return (
                  <Pressable key={f.key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => setFilter(f.key)} style={[styles.chip, active && styles.chipActive]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          ) : null}
        </>
      ) : null}
    </View>
  )

  if (items === null && !error) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={C.blue} />
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

  return (
    <FlatList
      data={visible}
      keyExtractor={(i) => i.id}
      numColumns={2}
      ListHeaderComponent={header}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.blue} />}
      ListEmptyComponent={
        <StateBlock
          icon="albums-outline"
          title="Aucune création pour l’instant"
          copy="Tes vidéos générées avec les outils ChapCam apparaîtront ici."
          cta="Créer ma première vidéo"
          onPress={onCreate}
        />
      }
      renderItem={({ item }) => <CreationCard item={item} width={cardW} onPress={() => open(item)} />}
    />
  )
}

function CreationCard({ item, width, onPress }) {
  const meta = TOOL_META[item.tool] || { label: 'Création', icon: 'film' }
  const [broken, setBroken] = useState(false)
  const playable = item.status === 'completed' && !!item.playback_url
  const title = item.title?.trim() || meta.label
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta.label}, ${formatDate(item.created_at)}`}
      accessibilityState={{ disabled: !playable }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && playable && styles.pressed]}
    >
      <View style={[styles.thumb, { height: width * 1.25 }]}>
        {item.thumbnail_url && !broken ? (
          <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBroken(true)} />
        ) : (
          <LinearGradient colors={['#E9EFFF', '#F1EBFF']} style={[StyleSheet.absoluteFill, styles.thumbFallback]}>
            <Ionicons name={meta.icon} size={28} color={C.violet} />
          </LinearGradient>
        )}
        <View style={styles.badgeRow}>
          <View style={styles.toolBadge}>
            <Ionicons name={meta.icon} size={11} color={C.white} />
            <Text style={styles.toolBadgeText} numberOfLines={1}>{meta.label}</Text>
          </View>
        </View>
        {item.status === 'processing' ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={C.white} size="small" />
            <Text style={styles.overlayText}>En cours</Text>
          </View>
        ) : item.status === 'failed' ? (
          <View style={styles.overlay}>
            <Ionicons name="alert-circle" size={20} color={C.white} />
            <Text style={styles.overlayText}>Échec</Text>
          </View>
        ) : playable ? (
          <View style={styles.play}>
            <Ionicons name="play" size={14} color={C.ink} />
          </View>
        ) : null}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
      </View>
    </Pressable>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  list: { paddingBottom: 120, flexGrow: 1 },
  header: { paddingHorizontal: PAD, paddingBottom: 14 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  title: { color: C.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: C.muted, fontSize: 14, fontWeight: '600', marginTop: 2 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chipsWrap: { marginTop: 14, marginHorizontal: -PAD },
  chips: { paddingHorizontal: PAD, gap: 8 },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: 999, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: C.white, fontWeight: '800' },
  row: { paddingHorizontal: PAD, gap: GAP, marginBottom: GAP },
  card: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: 'hidden', ...shadow, shadowOpacity: 0.06 },
  thumb: { backgroundColor: '#E9EFFF', overflow: 'hidden' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  badgeRow: { position: 'absolute', top: 8, left: 8, right: 8, flexDirection: 'row' },
  toolBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: 'rgba(14,21,48,0.55)', maxWidth: '100%' },
  toolBadgeText: { color: C.white, fontSize: 11, fontWeight: '700', flexShrink: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,21,48,0.45)', alignItems: 'center', justifyContent: 'center', gap: 6 },
  overlayText: { color: C.white, fontSize: 13, fontWeight: '800' },
  play: { position: 'absolute', right: 8, bottom: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 },
  cardBody: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  cardTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  cardDate: { color: C.muted, fontSize: 12, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 120 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: PAD * 2, paddingTop: 48, paddingBottom: 140, gap: 10 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E9EFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stateTitle: { color: C.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.3, textAlign: 'center' },
  stateCopy: { color: C.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 10 },
  stateCta: { height: 46, paddingHorizontal: 22, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  stateCtaText: { color: C.white, fontSize: 15, fontWeight: '800' },
})
