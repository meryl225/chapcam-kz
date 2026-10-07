import React, { useState } from 'react'
import { ActivityIndicator, Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiJson, friendlyError } from '../lib/api'
import { C } from './catalog'

// Official ChapCam accounts. Keep in sync with SOCIAL_NETWORKS in lib/jetons.ts.
const NETWORKS = [
  { id: 'tiktok', label: 'TikTok', handle: '@chapcam', icon: 'logo-tiktok', url: 'https://www.tiktok.com/@chapcam' },
  { id: 'instagram', label: 'Instagram', handle: '@chapcam', icon: 'logo-instagram', url: 'https://www.instagram.com/chapcam' },
  { id: 'facebook', label: 'Facebook', handle: 'ChapCam', icon: 'logo-facebook', url: 'https://www.facebook.com/chapcam' },
  { id: 'x', label: 'X', handle: '@chapcam', icon: 'logo-x', url: 'https://x.com/chapcam' },
]

export function SocialBonusSheet({ visible, onClose, onClaimed }) {
  const insets = useSafeAreaInsets()
  const [visited, setVisited] = useState([])
  const [claiming, setClaiming] = useState(false)
  const ready = NETWORKS.every((n) => visited.includes(n.id))

  const follow = async (network) => {
    try {
      await Linking.openURL(network.url)
      setVisited((prev) => (prev.includes(network.id) ? prev : [...prev, network.id]))
    } catch {
      Alert.alert('Lien indisponible', `Impossible d’ouvrir ${network.label} sur cet appareil.`)
    }
  }

  const close = () => {
    if (!claiming) onClose()
  }

  const claim = async () => {
    if (!ready || claiming) return
    setClaiming(true)
    try {
      const { response, body } = await apiJson('/api/mobile/social-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visited }),
      })
      if (!response.ok) throw new Error(body?.error || 'Bonus indisponible pour le moment.')
      onClaimed?.()
      onClose()
      Alert.alert(
        body.credited ? '5 jetons ajoutés' : 'Bonus déjà obtenu',
        body.credited ? 'Merci de suivre ChapCam. Tes jetons sont disponibles.' : 'Ce bonus a déjà été crédité sur ton compte.',
      )
    } catch (e) {
      Alert.alert('Bonus réseaux', friendlyError(e, 'Bonus indisponible pour le moment. Réessaie dans un instant.'))
    } finally {
      setClaiming(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.wrap}>
        <Pressable style={s.backdrop} onPress={close} accessibilityLabel="Fermer" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <View style={s.header}>
            <View style={s.icon}>
              <Ionicons name="gift-outline" size={22} color={C.blue} />
            </View>
            <View style={s.headerText}>
              <Text style={s.title} accessibilityRole="header">5 jetons offerts</Text>
              <Text style={s.copy}>Suis ChapCam sur les 4 réseaux, puis récupère ton bonus. Offert une seule fois par compte.</Text>
            </View>
          </View>

          <View style={s.list}>
            {NETWORKS.map((network, index) => {
              const done = visited.includes(network.id)
              return (
                <Pressable
                  key={network.id}
                  onPress={() => follow(network)}
                  accessibilityRole="button"
                  accessibilityLabel={`Suivre ChapCam sur ${network.label}`}
                  accessibilityState={{ checked: done }}
                  style={({ pressed }) => [s.row, index > 0 && s.rowBorder, pressed && s.pressed]}
                >
                  <View style={s.rowIcon}>
                    <Ionicons name={network.icon} size={18} color={C.ink} />
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowLabel}>{network.label}</Text>
                    <Text style={s.rowHandle}>{network.handle}</Text>
                  </View>
                  {done ? (
                    <View style={s.done}>
                      <Ionicons name="checkmark" size={14} color={C.blue} />
                      <Text style={s.doneText}>Suivi</Text>
                    </View>
                  ) : (
                    <View style={s.followBtn}>
                      <Text style={s.followText}>Suivre</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>

          <Pressable
            onPress={claim}
            disabled={!ready || claiming}
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready || claiming }}
            style={({ pressed }) => [s.cta, (!ready || claiming) && s.ctaOff, pressed && s.pressed]}
          >
            {claiming ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={s.ctaText}>{ready ? 'Récupérer mes 5 jetons' : `${visited.length}/${NETWORKS.length} réseaux suivis`}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,18,53,0.45)' },
  sheet: { gap: 16, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: C.white },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.softBlue },
  headerText: { flex: 1, gap: 2 },
  title: { color: C.ink, fontSize: 19, fontWeight: '900' },
  copy: { color: C.muted, fontSize: 14, lineHeight: 20 },
  list: { borderRadius: 18, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  rowText: { flex: 1, gap: 1 },
  rowLabel: { color: C.ink, fontSize: 15, fontWeight: '800' },
  rowHandle: { color: C.muted, fontSize: 13 },
  followBtn: { paddingHorizontal: 14, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ink },
  followText: { color: C.white, fontSize: 13, fontWeight: '800' },
  done: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: C.softBlue },
  doneText: { color: C.blue, fontSize: 13, fontWeight: '800' },
  cta: { alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 26, backgroundColor: C.blue },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: C.white, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },
})
