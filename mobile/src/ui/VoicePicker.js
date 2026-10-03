import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio'
import { C, normalize } from './catalog'

// voices: [{ id, name, meta, previewUrl, group }]
export function VoicePicker({ voices, selectedId, onSelect, accent = C.blue }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(() => new Set())
  const [previewId, setPreviewId] = useState(null)
  const player = useAudioPlayer(null)
  const status = useAudioPlayerStatus(player)

  useEffect(() => {
    if (previewId && status.didJustFinish) setPreviewId(null)
  }, [status.didJustFinish, previewId])

  const selected = voices.find((v) => v.id === selectedId) || null

  useEffect(() => {
    if (selected) setOpen((prev) => (prev.has(selected.group) ? prev : new Set(prev).add(selected.group)))
  }, [selected])

  const groups = useMemo(() => {
    const q = normalize(query)
    const map = new Map()
    for (const v of voices) {
      if (q && !normalize(`${v.name} ${v.meta || ''} ${v.group}`).includes(q)) continue
      if (!map.has(v.group)) map.set(v.group, [])
      map.get(v.group).push(v)
    }
    return [...map.entries()].map(([label, list]) => ({ label, list }))
  }, [voices, query])

  const preview = (voice) => {
    if (!voice.previewUrl) return
    if (previewId === voice.id) {
      player.pause()
      setPreviewId(null)
      return
    }
    player.replace({ uri: voice.previewUrl })
    player.play()
    setPreviewId(voice.id)
  }

  const searching = query.trim().length > 0

  return (
    <View style={styles.wrap}>
      <View style={styles.search}>
        <Ionicons name="search" size={16} color={C.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Rechercher une voix (nom, langue, accent)…" placeholderTextColor={C.muted} style={styles.searchInput} autoCorrect={false} clearButtonMode="while-editing" />
      </View>

      {selected && !searching ? (
        <View style={[styles.banner, { borderColor: accent }]}>
          <PreviewButton active={previewId === selected.id} disabled={!selected.previewUrl} onPress={() => preview(selected)} />
          <View style={styles.flex}>
            <Text style={styles.name} numberOfLines={1}><Text style={styles.muted}>Voix choisie : </Text>{selected.name}</Text>
            {selected.meta ? <Text style={styles.meta} numberOfLines={1}>{selected.meta}</Text> : null}
          </View>
          <View style={[styles.pill, { backgroundColor: accent }]}><Text style={styles.pillText}>Choisie</Text></View>
        </View>
      ) : null}

      {voices.length === 0 ? <Text style={styles.empty}>Chargement des voix…</Text> : null}
      {voices.length > 0 && groups.length === 0 ? <Text style={styles.empty}>Aucune voix ne correspond à ta recherche.</Text> : null}

      {groups.map(({ label, list }) => {
        const isOpen = searching || open.has(label)
        const hasSelected = list.some((v) => v.id === selectedId)
        return (
          <View key={label} style={styles.group}>
            <Pressable
              onPress={() => setOpen((prev) => { const next = new Set(prev); next.has(label) ? next.delete(label) : next.add(label); return next })}
              style={styles.groupHead}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <Text style={styles.groupLabel}>{label}</Text>
              <Text style={styles.count}>({list.length})</Text>
              {hasSelected && !isOpen ? <Ionicons name="checkmark-circle" size={15} color={accent} /> : null}
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={17} color={C.muted} style={styles.chev} />
            </Pressable>
            {isOpen ? list.map((voice) => {
              const active = voice.id === selectedId
              return (
                <View key={voice.id} style={[styles.row, active && { backgroundColor: '#F0F4FF' }]}>
                  <PreviewButton active={previewId === voice.id} disabled={!voice.previewUrl} onPress={() => preview(voice)} />
                  <View style={styles.flex}>
                    <Text style={styles.name} numberOfLines={1}>{voice.name}</Text>
                    {voice.meta ? <Text style={styles.meta} numberOfLines={1}>{voice.meta}</Text> : null}
                  </View>
                  <Pressable onPress={() => onSelect(voice)} style={[styles.choose, active && { backgroundColor: accent, borderColor: accent }]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                    {active ? <Ionicons name="checkmark" size={14} color={C.white} /> : null}
                    <Text style={[styles.chooseText, active && styles.chooseTextOn]}>{active ? 'Choisie' : 'Choisir'}</Text>
                  </Pressable>
                </View>
              )
            }) : null}
          </View>
        )
      })}
    </View>
  )
}

function PreviewButton({ active, disabled, onPress }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.preview, disabled && styles.disabled]} accessibilityRole="button" accessibilityLabel={active ? "Arrêter l'aperçu" : 'Écouter un aperçu'}>
      <Ionicons name={active ? 'pause' : 'play'} size={15} color={C.ink} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  flex: { flex: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4' },
  searchInput: { flex: 1, color: C.ink, fontSize: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.white, borderWidth: 1.5 },
  muted: { color: C.muted, fontWeight: '600' },
  pill: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { color: C.white, fontSize: 12, fontWeight: '800' },
  empty: { color: C.muted, fontSize: 13, textAlign: 'center', paddingVertical: 14 },
  group: { borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#E5E9F4', overflow: 'hidden' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 13 },
  groupLabel: { color: C.ink, fontSize: 12, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },
  count: { color: C.muted, fontSize: 11 },
  chev: { marginLeft: 'auto' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F2F8' },
  preview: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F3F9' },
  disabled: { opacity: 0.35 },
  name: { color: C.ink, fontSize: 14, fontWeight: '800' },
  meta: { color: C.muted, fontSize: 11, marginTop: 2 },
  choose: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 10, borderWidth: 1, borderColor: '#E5E9F4', paddingHorizontal: 10, paddingVertical: 6 },
  chooseText: { color: C.ink, fontSize: 12, fontWeight: '800' },
  chooseTextOn: { color: C.white },
})
