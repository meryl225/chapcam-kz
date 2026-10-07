import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { API_URL } from '../lib/api'
import { C } from './catalog'

export const AI_CONSENT_KEY = 'ai_data_consent_at'

export const hasAiDataConsent = (user) => Boolean(user?.user_metadata?.[AI_CONSENT_KEY])

const PROVIDERS = [
  { name: 'HeyGen', use: 'Photos en Vidéo, Traduction vidéo, voix' },
  { name: 'Decart et LiveKit', use: 'Live Swap (vidéo en temps réel)' },
  { name: 'Kling', use: 'Motion Control' },
  { name: 'ElevenLabs et Resemble AI', use: 'Message vocal, génération et transformation de voix' },
]

const DATA_SENT = [
  'Les photos et vidéos que vous choisissez',
  'L’image de votre visage filmée par la caméra',
  'Les enregistrements de votre voix',
]

const openPrivacy = () => WebBrowser.openBrowserAsync(`${API_URL}/confidentialite`).catch(() => {})

export function AiDataConsentSheet({ visible, onAccept, onDecline }) {
  const insets = useSafeAreaInsets()
  const [saving, setSaving] = useState(false)

  const accept = async () => {
    if (saving) return
    setSaving(true)
    try {
      await onAccept()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDecline}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.iconWrap}>
              <Ionicons name="shield-checkmark" size={26} color={C.blue} />
            </View>
            <Text style={s.title} accessibilityRole="header">Partage de vos données avec des services d’IA</Text>
            <Text style={s.body}>
              Pour créer vos contenus, ChapCam envoie certaines données à des services d’intelligence artificielle tiers. Nous avons besoin de votre accord avant la première utilisation.
            </Text>

            <Text style={s.section}>Données envoyées</Text>
            {DATA_SENT.map((item) => (
              <View key={item} style={s.row}>
                <Ionicons name="checkmark-circle" size={16} color={C.violet} />
                <Text style={s.rowText}>{item}</Text>
              </View>
            ))}

            <Text style={s.section}>Services destinataires</Text>
            {PROVIDERS.map((p) => (
              <View key={p.name} style={s.provider}>
                <Text style={s.providerName}>{p.name}</Text>
                <Text style={s.providerUse}>{p.use}</Text>
              </View>
            ))}

            <Text style={s.body}>
              Ces données servent uniquement à générer le contenu que vous demandez. Elles ne sont pas vendues et ne servent pas à la publicité. Vous pouvez retirer votre accord à tout moment en supprimant votre compte depuis le Profil.
            </Text>
            <Text style={s.link} onPress={openPrivacy} accessibilityRole="link">Lire la politique de confidentialité</Text>
          </ScrollView>

          <Pressable
            onPress={accept}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving, busy: saving }}
            style={[s.primary, saving && s.primaryBusy]}
          >
            <Text style={s.primaryText}>{saving ? 'Enregistrement…' : 'J’accepte'}</Text>
          </Pressable>
          <Pressable onPress={onDecline} disabled={saving} accessibilityRole="button" style={s.secondary}>
            <Text style={s.secondaryText}>Refuser</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(11,18,53,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 22, maxHeight: '90%' },
  content: { paddingBottom: 16 },
  iconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 21, fontWeight: '800', color: C.ink, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21, color: C.muted, marginTop: 4 },
  section: { fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: C.ink, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20, color: C.ink },
  provider: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  providerName: { fontSize: 14, fontWeight: '700', color: C.ink },
  providerUse: { fontSize: 13, lineHeight: 19, color: C.muted, marginTop: 2 },
  link: { fontSize: 14, fontWeight: '700', color: C.blue, marginTop: 12 },
  primary: { height: 52, borderRadius: 26, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBusy: { opacity: 0.6 },
  primaryText: { fontSize: 16, fontWeight: '800', color: C.white },
  secondary: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  secondaryText: { fontSize: 15, fontWeight: '700', color: C.muted },
})
