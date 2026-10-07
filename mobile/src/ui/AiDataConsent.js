import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { API_URL } from '../lib/api'
import { C } from './catalog'

export const AI_CONSENT_KEY = 'ai_data_consent_at'

export const hasAiDataConsent = (user) => Boolean(user?.user_metadata?.[AI_CONSENT_KEY])

const DATA_SENT = [
  { icon: 'images-outline', label: 'Photos et vidéos sélectionnées' },
  { icon: 'camera-outline', label: 'Image filmée par la caméra' },
  { icon: 'mic-outline', label: 'Enregistrements vocaux' },
]

const openSubprocessors = () =>
  WebBrowser.openBrowserAsync(`${API_URL}/confidentialite#sous-traitants`).catch(() => {})

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
          <View style={s.grabber} />
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.iconWrap}>
              <Ionicons name="shield-checkmark" size={24} color={C.blue} />
            </View>
            <Text style={s.title} accessibilityRole="header">Partage de vos données avec des services d’IA</Text>
            <Text style={s.lead}>Votre accord est nécessaire avant la première utilisation.</Text>

            <Text style={s.section}>Utilisation de vos données par nos services IA</Text>
            <Text style={s.body}>
              Certaines fonctionnalités ChapCam nécessitent l’envoi temporaire de vos photos, vidéos, images de caméra ou enregistrements vocaux à des prestataires technologiques tiers afin de générer le contenu demandé.
            </Text>

            <Text style={s.section}>Données envoyées</Text>
            <View style={s.card}>
              {DATA_SENT.map((item, i) => (
                <View key={item.label} style={[s.row, i > 0 && s.rowDivider]}>
                  <View style={s.rowIcon}>
                    <Ionicons name={item.icon} size={17} color={C.violet} />
                  </View>
                  <Text style={s.rowText}>{item.label}</Text>
                </View>
              ))}
            </View>

            <Text style={s.section}>Pourquoi ces données sont utilisées</Text>
            <Text style={s.body}>
              Création, transformation, traduction et génération de contenu avec les outils IA ChapCam.
            </Text>

            <Text style={s.note}>
              Vos données ne sont ni vendues ni utilisées à des fins publicitaires. Vous pouvez retirer votre accord à tout moment en supprimant votre compte depuis le Profil.
            </Text>

            <Pressable onPress={openSubprocessors} accessibilityRole="link" hitSlop={8} style={s.linkRow}>
              <Text style={s.link}>En savoir plus sur nos sous-traitants</Text>
              <Ionicons name="arrow-forward" size={13} color={C.muted} />
            </Pressable>
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
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10, maxHeight: '90%' },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: 18 },
  content: { paddingBottom: 18 },
  iconWrap: { width: 48, height: 48, borderRadius: 15, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  lead: { fontSize: 14, lineHeight: 20, color: C.muted, marginTop: 6 },
  section: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 22, marginBottom: 6 },
  body: { fontSize: 14, lineHeight: 21, color: C.muted },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, paddingHorizontal: 14, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  rowIcon: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.softBlue, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600', color: C.ink },
  note: { fontSize: 12.5, lineHeight: 18, color: C.muted, marginTop: 22 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12, alignSelf: 'flex-start' },
  link: { fontSize: 13, fontWeight: '600', color: C.muted, textDecorationLine: 'underline' },
  primary: { height: 54, borderRadius: 27, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  primaryBusy: { opacity: 0.6 },
  primaryText: { fontSize: 16, fontWeight: '800', color: C.white },
  secondary: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  secondaryText: { fontSize: 15, fontWeight: '700', color: C.muted },
})
