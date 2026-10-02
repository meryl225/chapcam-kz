import React, { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, CATEGORIES, GAP, PAD, TOOLS, normalize } from '../ui/catalog'
import { ToolCard } from '../ui/ToolCard'

export function ExploreScreen({ onOpenTool }) {
  const { width } = useWindowDimensions()
  const cardW = (width - PAD * 2 - GAP) / 2
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const results = useMemo(() => {
    const q = normalize(query)
    return TOOLS.filter((tool) => {
      const inCategory = category === 'all' || tool.categories.includes(category)
      const matches = !q || normalize(`${tool.title} ${tool.copy}`).includes(q)
      return inCategory && matches
    })
  }, [query, category])

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={styles.title} accessibilityRole="header">Explorer</Text>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={C.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un outil, un effet, une idée…"
            placeholderTextColor={C.muted}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Rechercher un outil"
          />
        </View>
        <Pressable accessibilityLabel="Filtres" accessibilityRole="button" onPress={() => setFiltersOpen(true)} style={[styles.filterBtn, category !== 'all' && styles.filterBtnOn]}>
          <Ionicons name="options-outline" size={20} color={category !== 'all' ? C.white : C.ink} />
        </Pressable>
      </View>

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFiltersOpen(false)} accessibilityLabel="Fermer les filtres" />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Filtrer les outils</Text>
          {CATEGORIES.map((c) => {
            const active = category === c.key
            const count = c.key === 'all' ? TOOLS.length : TOOLS.filter((t) => t.categories.includes(c.key)).length
            return (
              <Pressable key={c.key} onPress={() => { setCategory(c.key); setFiltersOpen(false) }} style={styles.sheetRow} accessibilityRole="button" accessibilityState={{ selected: active }}>
                <Text style={[styles.sheetLabel, active && styles.sheetLabelOn]}>{c.label}</Text>
                <Text style={styles.sheetCount}>{count}</Text>
                {active ? <Ionicons name="checkmark" size={18} color={C.blue} /> : null}
              </Pressable>
            )
          })}
          <Pressable onPress={() => { setCategory('all'); setQuery(''); setFiltersOpen(false) }} style={styles.sheetReset} accessibilityRole="button">
            <Text style={styles.sheetResetText}>Réinitialiser</Text>
          </Pressable>
        </View>
      </Modal>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.chips}
        accessibilityRole="tablist"
      >
        {CATEGORIES.map((c) => {
          const active = category === c.key
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {results.length ? (
        <View style={styles.grid}>
          {results.map((tool) => (
            <ToolCard key={tool.key} tool={tool} width={cardW} onPress={() => onOpenTool(tool.key)} />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={28} color={C.muted} />
          <Text style={styles.emptyTitle}>Aucun outil trouvé</Text>
          <Text style={styles.emptyCopy}>Essaie un autre mot ou une autre catégorie.</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filterBtnOn: { backgroundColor: C.blue, borderColor: C.blue },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,18,51,0.35)' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: PAD, paddingTop: 20, paddingBottom: 40 },
  sheetTitle: { color: C.ink, fontSize: 19, fontWeight: '900', marginBottom: 8 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F2F8' },
  sheetLabel: { flex: 1, color: C.ink, fontSize: 15, fontWeight: '700' },
  sheetLabelOn: { color: C.blue, fontWeight: '900' },
  sheetCount: { color: C.muted, fontSize: 13 },
  sheetReset: { marginTop: 16, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F3F9' },
  sheetResetText: { color: C.ink, fontSize: 15, fontWeight: '800' },
  content: { paddingHorizontal: PAD, paddingTop: 8, paddingBottom: 120 },
  title: { color: C.ink, fontSize: 30, fontWeight: '900', letterSpacing: -0.8, marginTop: 8 },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  search: { flex: 1, height: 48, backgroundColor: C.white, borderRadius: 16, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: C.ink },
  filterBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  bleed: { marginHorizontal: -PAD, marginTop: 16, marginBottom: 16, flexGrow: 0 },
  chips: { paddingHorizontal: PAD, gap: 8 },
  chip: { paddingHorizontal: 16, height: 36, borderRadius: 999, backgroundColor: C.white, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { color: C.ink, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: C.white, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 6 },
  emptyTitle: { color: C.ink, fontSize: 16, fontWeight: '800', marginTop: 4 },
  emptyCopy: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
})
