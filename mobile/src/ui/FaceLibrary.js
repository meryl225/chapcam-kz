import React, { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BRAND, C } from './catalog'
import { PRESET_FACES } from '../lib/liveSwapPresets'

const SIZE = 68

function Avatar({ uri, label, selected, loading, favorite, onPress, onLongPress }) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, busy: loading }}
      accessibilityHint={onLongPress ? 'Appui long pour ajouter ou retirer des favoris' : undefined}
      style={styles.item}
    >
      {selected ? (
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.ring, styles.glow]}>
          <Image source={{ uri }} style={styles.image} />
        </LinearGradient>
      ) : (
        <View style={styles.ring}>
          <Image source={{ uri }} style={styles.image} />
        </View>
      )}
      {loading ? (
        <View style={styles.loading}><ActivityIndicator color={C.white} /></View>
      ) : null}
      {selected && !loading ? (
        <View style={styles.check}><Ionicons name="checkmark" size={12} color={C.white} /></View>
      ) : null}
      {favorite ? (
        <View style={styles.heart}><Ionicons name="heart" size={11} color={C.violet} /></View>
      ) : null}
      <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  )
}

export function FaceLibrary({ face, customFace, loadingId, favorites, onSelectPreset, onSelectCustom, onImport, onToggleFavorite }) {
  const [tab, setTab] = useState('all')
  const presets = tab === 'favorites' ? PRESET_FACES.filter((p) => favorites.includes(p.id)) : PRESET_FACES
  const selectedPreset = face?.source === 'preset' ? face.presetId : null
  const selectedIsFavorite = selectedPreset ? favorites.includes(selectedPreset) : false

  return (
    <View style={styles.card}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {[
          { key: 'all', label: 'Visages' },
          { key: 'favorites', label: 'Favoris' },
        ].map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }} hitSlop={8}>
            <Text style={[styles.tab, tab === t.key && styles.tabActive]}>{t.label}</Text>
          </Pressable>
        ))}
        <View style={styles.flex} />
        {selectedPreset ? (
          <Pressable
            onPress={() => onToggleFavorite(selectedPreset)}
            accessibilityRole="button"
            accessibilityLabel={selectedIsFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            hitSlop={10}
          >
            <Ionicons name={selectedIsFavorite ? 'heart' : 'heart-outline'} size={22} color={selectedIsFavorite ? C.violet : C.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} decelerationRate="fast">
        <Pressable onPress={onImport} accessibilityRole="button" accessibilityLabel="Importer ton propre visage" style={styles.item}>
          <View style={[styles.ring, styles.add]}><Ionicons name="add" size={30} color={C.blue} /></View>
          <Text style={styles.label}>Ajouter</Text>
        </Pressable>

        {tab === 'all' && customFace ? (
          <Avatar uri={customFace.uri} label="Mon visage" selected={face?.source === 'upload'} onPress={onSelectCustom} />
        ) : null}

        {presets.map((p) => (
          <Avatar
            key={p.id}
            uri={p.url}
            label={p.label}
            selected={selectedPreset === p.id}
            loading={loadingId === p.id}
            favorite={favorites.includes(p.id)}
            onPress={() => onSelectPreset(p)}
            onLongPress={() => onToggleFavorite(p.id)}
          />
        ))}

        {tab === 'favorites' && presets.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Appuie longuement sur un visage, ou sur le cœur, pour l&apos;ajouter à tes favoris.</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1, borderColor: C.line, paddingTop: 14, paddingBottom: 12, gap: 12 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 16 },
  tab: { color: C.muted, fontSize: 16, fontWeight: '700' },
  tabActive: { color: C.ink },
  row: { gap: 12, paddingHorizontal: 14 },
  item: { width: SIZE + 8, alignItems: 'center', gap: 6 },
  ring: { width: SIZE + 6, height: SIZE + 6, borderRadius: (SIZE + 6) / 2, padding: 3, backgroundColor: C.softBlue },
  glow: { shadowColor: C.violet, shadowOpacity: 0.55, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  image: { flex: 1, borderRadius: SIZE / 2, backgroundColor: C.line, borderWidth: 2, borderColor: C.white },
  add: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1.5, borderColor: C.blue, borderStyle: 'dashed' },
  loading: { position: 'absolute', top: 0, width: SIZE + 6, height: SIZE + 6, borderRadius: (SIZE + 6) / 2, backgroundColor: 'rgba(14,21,48,0.45)', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: SIZE - 16, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: C.blue, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 0, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  label: { color: C.muted, fontSize: 12, fontWeight: '600' },
  labelActive: { color: C.ink },
  empty: { width: 220, justifyContent: 'center' },
  emptyText: { color: C.muted, fontSize: 13, lineHeight: 18 },
})
