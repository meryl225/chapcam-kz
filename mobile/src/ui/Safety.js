import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { API_URL, friendlyError } from '../lib/api'
import { C } from './catalog'
import { ChapCamLoader } from './ChapCamLoader'

export const RIGHTS_TEXT = 'Je confirme disposer des droits et autorisations nécessaires pour utiliser ce contenu.'
const CHARTER_URL = `${API_URL}/charte`

const REPORT_REASONS = [
  'Usurpation d’identité',
  'Escroquerie ou fraude',
  'Cybercriminalité',
  'Désinformation / deepfake trompeur',
  'Atteinte à la réputation ou à la vie privée',
  'Contenu intime non consenti',
  'Autre',
]

const openCharter = () => WebBrowser.openBrowserAsync(CHARTER_URL).catch(() => {})

export function RightsConsent({ checked, onChange, disabled }) {
  return (
    <View style={s.consent}>
      <Pressable
        onPress={() => onChange(!checked)}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={RIGHTS_TEXT}
        hitSlop={6}
        style={s.consentRow}
      >
        <View style={[s.box, checked && s.boxOn]}>
          {checked ? <Ionicons name="checkmark" size={14} color={C.white} /> : null}
        </View>
        <Text style={s.consentText}>{RIGHTS_TEXT}</Text>
      </Pressable>
      <Text style={s.rules}>
        {'Interdit sur ChapCam : usurpation d’identité ou fraude, utilisation du visage ou de la voix d’autrui sans son consentement, contenus trompeurs ou illégaux. '}
        <Text style={s.rulesLink} onPress={openCharter} accessibilityRole="link">Charte d’utilisation</Text>
      </Text>
      {!checked ? <Text style={s.required}>Confirmation requise pour continuer.</Text> : null}
    </View>
  )
}

export function AiBadge({ tone = 'light' }) {
  const dark = tone === 'dark'
  return (
    <View style={[s.badge, dark && s.badgeDark]} accessibilityLabel="Contenu généré par intelligence artificielle">
      <Ionicons name="sparkles" size={11} color={dark ? C.white : C.violet} />
      <Text style={[s.badgeText, dark && s.badgeTextDark]}>Généré par IA</Text>
    </View>
  )
}

export function ReportAbuseButton({ contentUrl, context }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Signaler un abus" hitSlop={8} style={s.reportLink}>
        <Ionicons name="flag-outline" size={14} color={C.muted} />
        <Text style={s.reportLinkText}>Signaler un abus</Text>
      </Pressable>
      <ReportAbuseSheet visible={open} onClose={() => setOpen(false)} contentUrl={contentUrl} context={context} />
    </>
  )
}

export function ReportAbuseSheet({ visible, onClose, contentUrl, context }) {
  const insets = useSafeAreaInsets()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const canSend = !!reason && details.trim().length > 0 && !sending

  const close = () => {
    if (sending) return
    setReason(''); setDetails('')
    onClose()
  }

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const { data } = await supabase.auth.getUser()
      const user = data?.user
      if (!user?.email) throw new Error('Reconnecte-toi pour envoyer un signalement.')
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
      const res = await fetch(`${API_URL}/api/report-abuse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: user.email,
          reason,
          description: `${details.trim()}\n\nSignalé depuis l’app iOS${context ? ` · ${context}` : ''}`,
          contentUrl: contentUrl || '',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Envoi impossible. Réessaie dans un instant.')
      setReason(''); setDetails('')
      onClose()
      Alert.alert('Signalement envoyé', 'Merci. Notre équipe va examiner ce contenu.')
    } catch (e) {
      Alert.alert('Signalement', friendlyError(e, 'Envoi impossible. Réessaie dans un instant.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={s.sheetWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={close} accessibilityLabel="Fermer" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.topBar}>
            <View style={s.handle} />
            <Pressable onPress={close} disabled={sending} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10} style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.85 }]}>
              <Ionicons name="close" size={20} color={C.ink} />
            </Pressable>
          </View>
          <Text style={s.sheetTitle} accessibilityRole="header">Signaler un abus</Text>
          <Text style={s.sheetCopy}>Ton signalement est transmis à l’équipe de modération ChapCam.</Text>
          <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Motif</Text>
            <View style={s.reasons}>
              {REPORT_REASONS.map((r) => {
                const active = reason === r
                return (
                  <Pressable key={r} onPress={() => setReason(r)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[s.reason, active && s.reasonOn]}>
                    <Text style={[s.reasonText, active && s.reasonTextOn]}>{r}</Text>
                  </Pressable>
                )
              })}
            </View>
            <Text style={s.label}>Détails</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={1000}
              placeholder="Décris le problème…"
              placeholderTextColor={C.muted}
              textAlignVertical="top"
              style={s.input}
              accessibilityLabel="Détails du signalement"
            />
          </ScrollView>
          <Pressable onPress={submit} disabled={!canSend} accessibilityRole="button" accessibilityState={{ disabled: !canSend, busy: sending }} style={[s.send, !canSend && s.sendOff]}>
            {sending ? <ChapCamLoader size="small" tone="light" /> : <Text style={s.sendText}>Envoyer le signalement</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  consent: { gap: 8, padding: 14, borderRadius: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.line },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: C.muted, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: C.violet, borderColor: C.violet },
  consentText: { flex: 1, color: C.ink, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  rules: { color: C.muted, fontSize: 12, lineHeight: 18 },
  rulesLink: { color: C.blue, fontWeight: '800', textDecorationLine: 'underline' },
  required: { color: C.violet, fontSize: 12, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#F0EBFF' },
  badgeDark: { backgroundColor: 'rgba(255,255,255,0.16)' },
  badgeText: { color: C.violet, fontSize: 11, fontWeight: '800' },
  badgeTextDark: { color: C.white },
  reportLink: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  reportLinkText: { color: C.muted, fontSize: 13, fontWeight: '700' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,21,48,0.45)' },
  sheet: { maxHeight: '85%', backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, gap: 8 },
  topBar: { height: 32, alignItems: 'center', justifyContent: 'center' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line },
  closeBtn: { position: 'absolute', top: 0, right: -4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  sheetTitle: { color: C.ink, fontSize: 19, fontWeight: '900' },
  sheetCopy: { color: C.muted, fontSize: 13, lineHeight: 19 },
  sheetScroll: { flexGrow: 0 },
  label: { color: C.ink, fontSize: 13, fontWeight: '800', marginTop: 10, marginBottom: 8 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  reasonOn: { backgroundColor: C.ink, borderColor: C.ink },
  reasonText: { color: C.ink, fontSize: 13, fontWeight: '700' },
  reasonTextOn: { color: C.white },
  input: { minHeight: 100, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, padding: 12, color: C.ink, fontSize: 15, lineHeight: 21 },
  send: { height: 52, borderRadius: 26, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  sendOff: { opacity: 0.4 },
  sendText: { color: C.white, fontSize: 15, fontWeight: '900' },
})
