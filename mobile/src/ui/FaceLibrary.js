import React, { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../i18n/Text'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BRAND, C } from './catalog'
import { PRESET_FACES } from '../lib/liveSwapPresets'

const DARK = { panel: 'rgba(10,11,20,0.82)', ring: 'rgba(255,255,255,0.9)', dim: '#2A2C33', text: '#9A9EAB' }

function Avatar({ uri, label, selected, loading, favorite, onPress, onLongPress, size }) {
  const outer = size + 8
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, busy: loading }}
      accessibilityHint={onLongPress ? 'Appui long pour plus d\u2019options' : undefined}
      style={{ width: outer + 6, height: outer + 6, alignItems: 'center', justifyContent: 'center' }}
    >
      {selected ? (
        <LinearGradient
          colors={[C.violet, C.blue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, styles.glow, { width: outer + 6, height: outer + 6, borderRadius: (outer + 6) / 2, padding: 4 }]}
        >
          <Image source={{ uri }} style={[styles.image, { borderRadius: size / 2 }]} />
        </LinearGradient>
      ) : (
        <View style={[styles.ring, { width: outer, height: outer, borderRadius: outer / 2 }]}>
          <Image source={{ uri }} style={[styles.image, { borderRadius: size / 2 }]} />
        </View>
      )}
      {loading ? (
        <View style={[styles.loading, { width: outer, height: outer, borderRadius: outer / 2 }]}>
          <ActivityIndicator color={C.white} />
        </View>
      ) : null}
      {selected && !loading ? (
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.check}>
          <Ionicons name="checkmark" size={14} color={C.white} />
        </LinearGradient>
      ) : null}
      {favorite && !selected ? (
        <View style={styles.heart}><Ionicons name="heart" size={10} color={C.violet} /></View>
      ) : null}
    </Pressable>
  )
}

export function FaceLibrary({ face, userFaces, pendingFace, loadingId, favorites, onSelectPreset, onSelectUser, onImport, onToggleFavorite, onFaceMenu, size = 68 }) {
  const [tab, setTab] = useState('all')
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const presets = (tab === 'favorites' ? PRESET_FACES.filter((p) => favorites.includes(p.id)) : PRESET_FACES).filter(
    (p) => !q || p.label.toLowerCase().includes(q),
  )
  const mine = q ? [] : tab === 'favorites' ? userFaces.filter((f) => favorites.includes(f.key)) : userFaces
  const selectedPreset = face?.source === 'preset' ? face.presetId : null
  const selectedKey = selectedPreset ?? face?.userFaceKey ?? null
  const showPending = tab === 'all' && !q && pendingFace && face === pendingFace

  const closeSearch = () => {
    setSearching(false)
    setQuery('')
  }

  return (
    <View style={styles.panel}>
      <View style={styles.tabs}>
        {searching ? (
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={DARK.text} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher un visage"
              placeholderTextColor={DARK.text}
              style={styles.searchInput}
              autoFocus
              returnKeyType="search"
              accessibilityLabel="Rechercher un visage"
            />
            <Pressable onPress={closeSearch} accessibilityRole="button" accessibilityLabel="Fermer la recherche" hitSlop={10}>
              <Ionicons name="close" size={18} color={C.white} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.tabGroup} accessibilityRole="tablist">
              {[
                { key: 'all', label: 'Visages' },
                { key: 'favorites', label: 'Favoris' },
              ].map((t) => (
                <Pressable key={t.key} onPress={() => setTab(t.key)} accessibilityRole="tab" accessibilityState={{ selected: tab === t.key }} hitSlop={8}>
                  <Text style={[styles.tab, tab === t.key && styles.tabActive]}>{t.label}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.flex} />
            {selectedKey ? (
              <Pressable
                onPress={() => onToggleFavorite(selectedKey)}
                accessibilityRole="button"
                accessibilityLabel={favorites.includes(selectedKey) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                hitSlop={10}
              >
                <Ionicons name={favorites.includes(selectedKey) ? 'heart' : 'heart-outline'} size={20} color={favorites.includes(selectedKey) ? C.violet : DARK.text} />
              </Pressable>
            ) : null}
            <Pressable onPress={() => setSearching(true)} accessibilityRole="button" accessibilityLabel="Rechercher un visage" hitSlop={10}>
              <Ionicons name="search" size={20} color={C.white} />
            </Pressable>
          </>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} decelerationRate="fast" keyboardShouldPersistTaps="handled">
        <Pressable onPress={onImport} accessibilityRole="button" accessibilityLabel="Importer ton propre visage" style={styles.addItem}>
          <View style={[styles.add, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}>
            <Ionicons name="add" size={30} color={C.white} />
          </View>
          <Text style={styles.addLabel}>Ajouter</Text>
        </Pressable>

        {showPending ? <Avatar uri={pendingFace.uri} label="Visage en cours d’enregistrement" size={size} selected loading /> : null}

        {mine.map((f) => (
          <Avatar
            key={f.key}
            uri={f.url}
            label="Visage importé"
            size={size}
            selected={selectedKey === f.key}
            loading={loadingId === f.key}
            favorite={favorites.includes(f.key)}
            onPress={() => onSelectUser(f)}
            onLongPress={() => onFaceMenu({ kind: 'user', key: f.key, uri: f.url, face: f })}
          />
        ))}

        {presets.map((p) => (
          <Avatar
            key={p.id}
            uri={p.url}
            label={p.label}
            size={size}
            selected={selectedPreset === p.id}
            loading={loadingId === p.id}
            favorite={favorites.includes(p.id)}
            onPress={() => onSelectPreset(p)}
            onLongPress={() => onFaceMenu({ kind: 'preset', key: p.id, uri: p.url, label: p.label, face: p })}
          />
        ))}

        {presets.length === 0 && mine.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {q ? 'Aucun visage ne correspond.' : 'Appuie longuement sur un visage pour l\u2019ajouter à tes favoris.'}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: { backgroundColor: DARK.panel, borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', paddingTop: 16, paddingBottom: 12, gap: 10 },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, minHeight: 28 },
  tabGroup: { flexDirection: 'row', gap: 24 },
  tab: { color: DARK.text, fontSize: 16, fontWeight: '700' },
  tabActive: { color: C.white },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 10, height: 36 },
  searchInput: { flex: 1, color: C.white, fontSize: 15, paddingVertical: 0 },
  row: { gap: 8, paddingHorizontal: 10, alignItems: 'center' },
  addItem: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)' },
  add: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(160,170,255,0.75)', backgroundColor: 'rgba(30,40,90,0.35)' },
  addLabel: { color: C.white, fontSize: 13, fontWeight: '600' },
  ring: { padding: 2, backgroundColor: DARK.ring },
  glow: { shadowColor: C.violet, shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  image: { flex: 1, backgroundColor: DARK.dim },
  loading: { position: 'absolute', backgroundColor: 'rgba(10,10,12,0.55)', alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', right: 0, bottom: 0, width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  heart: { position: 'absolute', top: 2, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(10,11,20,0.9)', alignItems: 'center', justifyContent: 'center' },
  empty: { width: 220, justifyContent: 'center', paddingHorizontal: 6 },
  emptyText: { color: DARK.text, fontSize: 13, lineHeight: 18 },
})
