import React, { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C } from './catalog'
import { POPULAR_LANGUAGE_IDS, describeLanguage, groupLanguages, normalizeText } from '../lib/translationLanguages'

const ROW_HEIGHT = 56

// languages: exact backend names; selected: exact backend name; onSelect receives that exact name.
export function LanguagePickerSheet({ visible, languages, failed, onRetry, selected, onSelect, onClose: closeSheet }) {
  const onClose = () => { setQuery(''); closeSheet() }
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())

  const groups = useMemo(() => groupLanguages(languages), [languages])
  const popular = useMemo(() => {
    const available = new Set(languages)
    return POPULAR_LANGUAGE_IDS.filter((id) => available.has(id)).map(describeLanguage)
  }, [languages])
  const selectedGroup = selected ? describeLanguage(selected).language : null

  const rows = useMemo(() => {
    const q = normalizeText(query)
    const out = []
    if (q) {
      for (const group of groups) {
        const groupHit = normalizeText(group.language).includes(q)
        const items = groupHit ? group.items : group.items.filter((item) => item.searchText.includes(q))
        if (!items.length) continue
        if (group.items.length === 1) out.push({ type: 'single', key: items[0].id, item: items[0] })
        else {
          out.push({ type: 'group', key: `g:${group.language}`, group, open: true, count: group.items.length })
          items.forEach((item) => out.push({ type: 'variant', key: item.id, item }))
        }
      }
      return out
    }
    if (popular.length) {
      out.push({ type: 'header', key: 'h:popular', title: 'Langues populaires' })
      popular.forEach((item) => out.push({ type: 'popular', key: `p:${item.id}`, item }))
    }
    out.push({ type: 'header', key: 'h:all', title: 'Toutes les langues' })
    let letter = ''
    for (const group of groups) {
      if (group.letter !== letter) {
        letter = group.letter
        out.push({ type: 'letter', key: `l:${letter}`, title: letter })
      }
      if (group.items.length === 1) {
        out.push({ type: 'single', key: group.items[0].id, item: group.items[0] })
        continue
      }
      const open = expanded.has(group.language)
      out.push({ type: 'group', key: `g:${group.language}`, group, open, count: group.items.length })
      if (open) group.items.forEach((item) => out.push({ type: 'variant', key: item.id, item }))
    }
    return out
  }, [groups, popular, query, expanded])

  const toggle = (language) => setExpanded((prev) => {
    const next = new Set(prev)
    next.has(language) ? next.delete(language) : next.add(language)
    return next
  })

  const pick = (id) => { onSelect(id); setQuery(''); onClose() }

  const renderRow = ({ item: row }) => {
    if (row.type === 'header') return <Text style={styles.header}>{row.title}</Text>
    if (row.type === 'letter') return <Text style={styles.letter}>{row.title}</Text>
    if (row.type === 'group') {
      const active = selectedGroup === row.group.language
      return (
        <Pressable onPress={() => !query && toggle(row.group.language)} style={styles.row} accessibilityRole="button" accessibilityState={{ expanded: row.open }} accessibilityLabel={`${row.group.language}, ${row.count} variantes`}>
          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, active && styles.rowTitleActive]}>{row.group.language}</Text>
            <Text style={styles.rowMeta}>{`${row.count} variantes`}</Text>
          </View>
          {active ? <View style={styles.dot} /> : null}
          {!query ? <Ionicons name={row.open ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} /> : null}
        </Pressable>
      )
    }
    const entry = row.item
    const isSelected = entry.id === selected
    const title = row.type === 'variant' ? entry.variant : entry.label
    return (
      <Pressable onPress={() => pick(entry.id)} style={[styles.row, row.type === 'variant' && styles.variantRow, isSelected && styles.rowSelected]} accessibilityRole="button" accessibilityState={{ selected: isSelected }} accessibilityLabel={entry.label}>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, row.type === 'variant' && styles.variantTitle, isSelected && styles.rowTitleActive]} numberOfLines={1}>{title}</Text>
        </View>
        {isSelected ? <Ionicons name="checkmark-circle" size={22} color={C.violet} /> : null}
      </Pressable>
    )
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.grabber} />
        <View style={styles.titleRow}>
          <Text style={styles.title}>Langue cible</Text>
          <Pressable onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Fermer">
            <Ionicons name="close" size={20} color={C.ink} />
          </Pressable>
        </View>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={18} color={C.muted} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher une langue ou un pays" placeholderTextColor={C.muted} style={styles.searchInput} autoCorrect={false} clearButtonMode="while-editing" returnKeyType="search" />
        </View>
        {!languages.length ? (
          failed ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Impossible de charger les langues pour le moment.</Text>
              <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button"><Text style={styles.retryText}>Réessayer</Text></Pressable>
            </View>
          ) : (
            <View style={styles.empty}><ActivityIndicator color={C.violet} /><Text style={styles.emptyText}>Chargement des langues disponibles…</Text></View>
          )
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => row.key}
            renderItem={renderRow}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={24}
            maxToRenderPerBatch={30}
            windowSize={11}
            removeClippedSubviews
            contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={styles.emptyText}>Aucune langue trouvée.</Text>}
          />
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: C.bg },
  grabber: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: C.border, marginTop: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  title: { color: C.ink, fontSize: 20, fontWeight: '900' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: 18, height: 46, borderRadius: 15, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 8 },
  searchInput: { flex: 1, color: C.ink, fontSize: 15 },
  list: { paddingHorizontal: 18, paddingBottom: 24 },
  header: { color: C.muted, fontSize: 12, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 18, marginBottom: 6 },
  letter: { color: C.violet, fontSize: 13, fontWeight: '900', marginTop: 12, marginBottom: 4, marginLeft: 4 },
  row: { minHeight: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: C.white, borderRadius: 14, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  variantRow: { marginLeft: 18, minHeight: 48, backgroundColor: C.white },
  rowSelected: { borderColor: C.violet, backgroundColor: '#F1ECFF' },
  rowText: { flex: 1 },
  rowTitle: { color: C.ink, fontSize: 15, fontWeight: '800' },
  variantTitle: { fontWeight: '700', fontSize: 14 },
  rowTitleActive: { color: C.violet },
  rowMeta: { color: C.muted, fontSize: 12, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.violet },
  empty: { alignItems: 'center', gap: 10, paddingTop: 40 },
  retry: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: '#F1ECFF', alignItems: 'center', justifyContent: 'center' },
  retryText: { color: C.violet, fontSize: 14, fontWeight: '800' },
  emptyText: { color: C.muted, fontSize: 14, textAlign: 'center', paddingTop: 24 },
})
