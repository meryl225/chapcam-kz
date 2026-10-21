import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { BRAND, C } from './catalog'

const DARK = { sheet: '#0D0F1C', row: 'rgba(255,255,255,0.06)', line: 'rgba(255,255,255,0.1)', text: '#9A9EAB', danger: '#FF5C7A' }

function Sheet({ visible, onClose, bottomInset = 0, children }) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
      <View style={[styles.sheet, { paddingBottom: Math.max(bottomInset, 16) + 8 }]}>
        <View style={styles.handle} />
        {children}
      </View>
    </Modal>
  )
}

// Generic dark action sheet: replaces Alert menus, which Android caps at three buttons.
export function ActionSheet({ visible, title, subtitle, image, actions, onClose, bottomInset }) {
  return (
    <Sheet visible={visible} onClose={onClose} bottomInset={bottomInset}>
      {title ? (
        <View style={styles.header}>
          {image ? <Image source={{ uri: image }} style={styles.headerImage} /> : null}
          <View style={styles.flex}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      ) : null}
      <View style={styles.list}>
        {actions.map((a) => (
          <Pressable
            key={a.label}
            onPress={() => {
              onClose()
              a.onPress()
            }}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
          >
            <View style={[styles.actionIcon, a.destructive && styles.actionIconDanger]}>
              <Ionicons name={a.icon} size={20} color={a.destructive ? DARK.danger : C.white} />
            </View>
            <Text style={[styles.actionLabel, a.destructive && styles.danger]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </Sheet>
  )
}

export function ManageFacesSheet({ visible, faces, onClose, onDelete, bottomInset }) {
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!visible) setSelected([])
  }, [visible])

  const toggle = (key) => setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]))
  const allSelected = faces.length > 0 && selected.length === faces.length

  const remove = async () => {
    setBusy(true)
    const done = await onDelete(selected)
    setBusy(false)
    if (done) setSelected([])
  }

  return (
    <Sheet visible={visible} onClose={onClose} bottomInset={bottomInset}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Gérer les visages</Text>
          <Text style={styles.subtitle}>
            {faces.length ? 'Sélectionne les visages importés à supprimer. Les avatars ChapCam ne peuvent pas être supprimés.' : 'Tu n\u2019as importé aucun visage.'}
          </Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10}>
          <Ionicons name="close" size={22} color={C.white} />
        </Pressable>
      </View>

      {faces.length ? (
        <>
          <Pressable
            onPress={() => setSelected(allSelected ? [] : faces.map((f) => f.key))}
            accessibilityRole="button"
            style={styles.selectAll}
            hitSlop={8}
          >
            <Text style={styles.selectAllText}>{allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}</Text>
          </Pressable>
          <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid}>
            {faces.map((f) => {
              const on = selected.includes(f.key)
              return (
                <Pressable
                  key={f.key}
                  onPress={() => toggle(f.key)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel="Visage importé"
                  style={styles.cell}
                >
                  <View style={[styles.cellRing, on && styles.cellRingOn]}>
                    <Image source={{ uri: f.url }} style={styles.cellImage} />
                  </View>
                  <View style={[styles.box, on && styles.boxOn]}>{on ? <Ionicons name="checkmark" size={14} color={C.white} /> : null}</View>
                </Pressable>
              )
            })}
          </ScrollView>
          <Pressable
            onPress={remove}
            disabled={!selected.length || busy}
            accessibilityRole="button"
            accessibilityState={{ disabled: !selected.length || busy, busy }}
            style={({ pressed }) => [styles.deleteBtn, (!selected.length || busy) && styles.disabled, pressed && styles.pressed]}
          >
            {busy ? <ActivityIndicator color={C.white} /> : <Ionicons name="trash-outline" size={18} color={C.white} />}
            <Text style={styles.deleteText}>{selected.length ? `Supprimer (${selected.length})` : 'Supprimer'}</Text>
          </Pressable>
        </>
      ) : (
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyLine} />
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: DARK.sheet, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: StyleSheet.hairlineWidth, borderColor: DARK.line, paddingHorizontal: 18, paddingTop: 10, gap: 14 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerImage: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: C.blue, backgroundColor: '#2A2C33' },
  title: { color: C.white, fontSize: 18, fontWeight: '700' },
  subtitle: { color: DARK.text, fontSize: 14, lineHeight: 20, marginTop: 2 },
  list: { gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: DARK.row, borderRadius: 16, paddingHorizontal: 14, minHeight: 56 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,107,255,0.22)' },
  actionIconDanger: { backgroundColor: 'rgba(255,92,122,0.15)' },
  actionLabel: { color: C.white, fontSize: 16, fontWeight: '600' },
  danger: { color: DARK.danger },
  pressed: { opacity: 0.7 },
  selectAll: { alignSelf: 'flex-start' },
  selectAllText: { color: C.blue, fontSize: 15, fontWeight: '600' },
  gridScroll: { maxHeight: 300 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  cell: { width: 72, height: 72 },
  cellRing: { flex: 1, borderRadius: 36, padding: 2, borderWidth: 2, borderColor: 'transparent' },
  cellRingOn: { borderColor: C.blue },
  cellImage: { flex: 1, borderRadius: 32, backgroundColor: '#2A2C33' },
  box: { position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: C.white, backgroundColor: 'rgba(10,11,20,0.85)', alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: C.blue },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 26, backgroundColor: DARK.danger },
  deleteText: { color: C.white, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  emptyLine: { height: 2, borderRadius: 1, opacity: 0.5 },
})
