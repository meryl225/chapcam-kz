import React, { useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiForm, friendlyError, readApiError } from '../lib/api'
import { C } from './catalog'

// Official ChapCam accounts. Keep in sync with SOCIAL_NETWORKS in lib/jetons.ts.
const NETWORKS = [
  { id: 'tiktok', label: 'TikTok', handle: '@multivoix.ci', icon: 'logo-tiktok', url: 'https://www.tiktok.com/@multivoix.ci?_r=1&_t=ZS-9AMIH938gLp' },
  { id: 'instagram', label: 'Instagram', handle: '@chapcam_officiel', icon: 'logo-instagram', url: 'https://www.instagram.com/chapcam_officiel?stkn=MWd2ZGV6eDM0OGZndQ%3D%3D&utm_source=qr' },
  { id: 'facebook', label: 'Facebook', handle: 'ChapCam', icon: 'logo-facebook', url: 'https://www.facebook.com/share/18YsqwgfJr/?mibextid=wwXIfr' },
  { id: 'x', label: 'X', handle: '@metaafrika', icon: 'logo-x', url: 'https://x.com/metaafrika?s=11' },
]
const MAX_PROOFS = 4
const MAX_PROOF_WIDTH = 1080

export function SocialBonusSheet({ visible, status, onClose, onSubmitted }) {
  const insets = useSafeAreaInsets()
  const [visited, setVisited] = useState([])
  const [proofs, setProofs] = useState([])
  const [sending, setSending] = useState(false)
  const pending = status === 'pending'
  const rejected = status === 'rejected'
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
    if (!sending) onClose()
  }

  const pickProofs = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(
        'Accès refusé',
        'Autorise l’accès à tes photos dans Réglages > ChapCam pour joindre tes captures d’écran.',
        [{ text: 'Annuler', style: 'cancel' }, { text: 'Ouvrir les Réglages', onPress: () => Linking.openSettings() }],
      )
      return
    }
    const remaining = MAX_PROOFS - proofs.length
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    })
    if (!result.canceled && result.assets?.length) {
      setProofs((prev) => [...prev, ...result.assets].slice(0, MAX_PROOFS))
    }
  }

  const removeProof = (uri) => setProofs((prev) => prev.filter((p) => p.uri !== uri))

  const submit = async () => {
    if (!ready || proofs.length === 0 || sending) return
    setSending(true)
    let stage = 'compression'
    try {
      // iOS screenshots are full-resolution PNGs: 4 of them exceed the 4.5 MB request limit of the server (HTTP 413).
      const form = new FormData()
      for (const [index, asset] of proofs.entries()) {
        const actions = asset.width > MAX_PROOF_WIDTH ? [{ resize: { width: MAX_PROOF_WIDTH } }] : []
        const compressed = await manipulateAsync(asset.uri, actions, { compress: 0.7, format: SaveFormat.JPEG })
        form.append('proofs', { uri: compressed.uri, name: `preuve-${index + 1}.jpg`, type: 'image/jpeg' })
      }
      stage = 'api'
      const response = await apiForm('/api/mobile/social-bonus', form)
      if (!response.ok) {
        const body = await response.clone().json().catch(() => null)
        stage = body?.stage || (response.status === 401 ? 'auth' : response.status === 413 ? 'upload' : 'api')
        if (__DEV__) console.log('[SocialBonus] échec', { status: response.status, stage, error: body?.error ?? null })
        if (response.status === 413) throw new Error('Captures trop lourdes. Réessaie avec des captures plus petites.')
        throw new Error(await readApiError(response, 'Envoi impossible pour le moment.'))
      }
      const result = await response.json().catch(() => null)
      if (result?.status !== 'pending') throw new Error('Envoi impossible pour le moment.')
      setProofs([])
      onSubmitted?.()
      onClose()
      Alert.alert('Preuve envoyée', 'Ta demande est en attente de vérification. Les 5 jetons seront ajoutés dès sa validation.')
    } catch (e) {
      if (__DEV__) console.log('[SocialBonus] erreur', { stage, message: e?.message })
      Alert.alert('Bonus réseaux', friendlyError(e, 'Envoi impossible pour le moment. Réessaie dans un instant.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.wrap}>
        <Pressable style={s.backdrop} onPress={close} accessibilityLabel="Fermer" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.handle} />
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} bounces={false}>
            <View style={s.header}>
              <View style={s.icon}>
                <Ionicons name={pending ? 'time-outline' : 'gift-outline'} size={22} color={C.blue} />
              </View>
              <View style={s.headerText}>
                <Text style={s.title} accessibilityRole="header">{pending ? 'Vérification en cours' : '5 jetons offerts'}</Text>
                <Text style={s.copy}>
                  {pending
                    ? 'Ta preuve est en attente de vérification. Les 5 jetons seront ajoutés dès sa validation.'
                    : 'Suis ChapCam sur les 4 réseaux, puis envoie tes captures d’écran. Offert une seule fois par compte.'}
                </Text>
              </View>
            </View>

            {pending ? (
              <Pressable onPress={onClose} accessibilityRole="button" style={({ pressed }) => [s.cta, pressed && s.pressed]}>
                <Text style={s.ctaText}>Compris</Text>
              </Pressable>
            ) : (
              <>
                {rejected ? (
                  <View style={s.notice}>
                    <Ionicons name="alert-circle-outline" size={16} color={C.ink} />
                    <Text style={s.noticeText}>Ta preuve précédente n’a pas été validée. Tu peux en envoyer une nouvelle.</Text>
                  </View>
                ) : null}

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
                            <Text style={s.doneText}>Ouvert</Text>
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

                {ready ? (
                  <View style={s.proofBlock}>
                    <View style={s.proofHeader}>
                      <Text style={s.proofTitle}>Captures d’écran</Text>
                      <Text style={s.proofCount}>{proofs.length}/{MAX_PROOFS}</Text>
                    </View>
                    <Text style={s.proofHint}>Montre que tu suis ChapCam sur chaque réseau.</Text>
                    <View style={s.thumbs}>
                      {proofs.map((asset) => (
                        <View key={asset.uri} style={s.thumb}>
                          <Image source={{ uri: asset.uri }} style={s.thumbImage} accessibilityIgnoresInvertColors />
                          <Pressable
                            onPress={() => removeProof(asset.uri)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Retirer cette capture"
                            style={s.thumbRemove}
                          >
                            <Ionicons name="close" size={12} color={C.white} />
                          </Pressable>
                        </View>
                      ))}
                      {proofs.length < MAX_PROOFS ? (
                        <Pressable
                          onPress={pickProofs}
                          disabled={sending}
                          accessibilityRole="button"
                          accessibilityLabel="Ajouter des captures d’écran"
                          style={({ pressed }) => [s.thumb, s.addThumb, pressed && s.pressed]}
                        >
                          <Ionicons name="add" size={22} color={C.blue} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <Pressable
                  onPress={submit}
                  disabled={!ready || proofs.length === 0 || sending}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !ready || proofs.length === 0 || sending }}
                  style={({ pressed }) => [s.cta, (!ready || proofs.length === 0 || sending) && s.ctaOff, pressed && s.pressed]}
                >
                  {sending ? (
                    <ActivityIndicator color={C.white} />
                  ) : (
                    <Text style={s.ctaText}>{ready ? 'Soumettre ma preuve' : `${visited.length}/${NETWORKS.length} réseaux ouverts`}</Text>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,18,53,0.45)' },
  sheet: { maxHeight: '90%', paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: C.white },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 16 },
  content: { gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.softBlue },
  headerText: { flex: 1, gap: 2 },
  title: { color: C.ink, fontSize: 19, fontWeight: '900' },
  copy: { color: C.muted, fontSize: 14, lineHeight: 20 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1, borderColor: C.line },
  noticeText: { flex: 1, color: C.ink, fontSize: 13, lineHeight: 18 },
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
  proofBlock: { gap: 8 },
  proofHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proofTitle: { color: C.ink, fontSize: 15, fontWeight: '800' },
  proofCount: { color: C.muted, fontSize: 13, fontWeight: '700' },
  proofHint: { color: C.muted, fontSize: 13, lineHeight: 18 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumb: { width: 68, height: 68, borderRadius: 14, overflow: 'hidden', backgroundColor: C.bg },
  thumbImage: { width: '100%', height: '100%' },
  thumbRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,18,53,0.7)' },
  addThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: C.blue, backgroundColor: C.softBlue },
  cta: { alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 26, backgroundColor: C.blue },
  ctaOff: { opacity: 0.45 },
  ctaText: { color: C.white, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },
})
