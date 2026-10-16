import React, { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C, normalize } from './catalog'

const VIOLET_SOFT = '#F1ECFF'
const BORDER = '#E8EAF3'

const FILTERS = [
  { id: 'all', label: 'Toutes', test: () => true },
  { id: 'fr', label: 'Françaises', test: (v) => v.isFrench },
  { id: 'female', label: 'Femmes', test: (v) => v.genderLabel === 'Femme' },
  { id: 'male', label: 'Hommes', test: (v) => v.genderLabel === 'Homme' },
]

// voices: [{ id, name, tagline, meta, description, isFrench, genderLabel }]
// preview: return value of useVoicePreview() (shared player).
export function VoiceCatalogSheet({ visible, voices, selectedId, onSelect, onClose, preview }) {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const list = useMemo(() => {
    const q = normalize(query)
    const test = FILTERS.find((f) => f.id === filter)?.test || (() => true)
    return voices.filter((v) => test(v) && (!q || normalize(`${v.name} ${v.tagline || ''} ${v.meta} ${v.description || ''}`).includes(q)))
  }, [voices, query, filter])

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.head}>
          <Text style={styles.title}>Choisir une voix</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={8}>
            <Ionicons name="close" size={20} color={C.ink} />
          </Pressable>
        </View>

        <View style={styles.search}>
          <Ionicons name="search" size={17} color={C.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher (nom, langue, accent)…" placeholderTextColor={C.muted} style={styles.searchInput} autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" />
        </View>

        <View style={styles.filters} accessibilityRole="tablist">
          {FILTERS.map((f) => {
            const on = f.id === filter
            return (
              <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filter, on && styles.filterOn]} accessibilityRole="tab" accessibilityState={{ selected: on }}>
                <Text style={[styles.filterText, on && styles.filterTextOn]}>{f.label}</Text>
              </Pressable>
            )
          })}
        </View>

        {preview.error ? <Text style={styles.error}>{preview.error}</Text> : null}

        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>{voices.length ? 'Aucune voix ne correspond à ta recherche.' : 'Chargement des voix…'}</Text>}
          renderItem={({ item }) => {
            const active = item.id === selectedId
            const playing = preview.isPlaying(item.id)
            const loading = preview.isLoading(item.id)
            return (
              <View style={[styles.row, active && styles.rowOn]}>
                <Pressable onPress={() => preview.toggle(item)} style={styles.play} accessibilityRole="button" accessibilityLabel={playing ? `Mettre en pause ${item.name}` : `Écouter ${item.name}`}>
                  {loading ? <ActivityIndicator size="small" color={C.violet} /> : <Ionicons name={playing ? 'pause' : 'play'} size={16} color={C.violet} style={playing ? null : styles.playIcon} />}
                </Pressable>
                <Pressable onPress={() => { onSelect(item); onClose() }} style={styles.info} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`Choisir ${item.name}`}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  {item.meta ? <Text style={styles.meta} numberOfLines={1}>{item.meta}</Text> : null}
                  {item.tagline ? <Text style={styles.tagline} numberOfLines={1}>{item.tagline}</Text> : null}
                </Pressable>
                {active ? <Ionicons name="checkmark-circle" size={22} color={C.violet} accessibilityLabel="Voix choisie" /> : null}
              </View>
            )
          }}
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, paddingTop: 18 },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 },
  title: { flex: 1, color: C.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, color: C.ink, fontSize: 15 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  filter: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: BORDER },
  filterOn: { backgroundColor: C.violet, borderColor: C.violet },
  filterText: { color: C.ink, fontSize: 13, fontWeight: '700' },
  filterTextOn: { color: C.white },
  list: { paddingHorizontal: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: BORDER },
  rowOn: { borderColor: C.violet, borderWidth: 1.5 },
  play: { width: 42, height: 42, borderRadius: 21, backgroundColor: VIOLET_SOFT, alignItems: 'center', justifyContent: 'center' },
  playIcon: { marginLeft: 2 },
  info: { flex: 1 },
  name: { color: C.ink, fontSize: 15, fontWeight: '800' },
  meta: { color: C.muted, fontSize: 12, marginTop: 2 },
  tagline: { color: '#9AA2BA', fontSize: 12, marginTop: 1 },
  empty: { color: C.muted, fontSize: 14, textAlign: 'center', paddingVertical: 28 },
  error: { color: '#DC2626', fontSize: 13, paddingHorizontal: 20, paddingBottom: 8 },
})
