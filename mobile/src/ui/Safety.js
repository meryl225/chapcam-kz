import React, { useState } from 'react'
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { Text, TextInput } from '../i18n/Text'
import { Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { API_URL, apiJson, friendlyError } from '../lib/api'
import { C } from './catalog'
import { ChapCamLoader } from './ChapCamLoader'

export const RIGHTS_TEXT = 'Je confirme disposer des droits et autorisations nécessaires pour utiliser ce contenu.'
const CHARTER_URL = `${API_URL}/charte`
const SEND_ERROR = 'Envoi impossible. Vérifie ta connexion et réessaie.'

// Values are sent as-is to /api/mobile/report, which validates them against the same list.
const REPORT_REASONS = [
  'Contenu sexuel',
  'Violence',
  'Haine ou harcèlement',
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
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Signaler un contenu" hitSlop={8} style={s.reportLink}>
        <Ionicons name="flag-outline" size={14} color={C.muted} />
        <Text style={s.reportLinkText}>Signaler un contenu</Text>
      </Pressable>
      <ReportAbuseSheet visible={open} onClose={() => setOpen(false)} contentUrl={contentUrl} context={context} />
    </>
  )
}

export function SheetResult({ ok, title, message, onPrimary, primaryLabel, onSecondary, secondaryLabel }) {
  return (
    <View style={s.result} accessibilityLiveRegion="polite">
      <View style={[s.resultIcon, ok ? s.resultIconOk : s.resultIconErr]}>
        <Ionicons name={ok ? 'checkmark' : 'alert'} size={26} color={C.white} />
      </View>
      <Text style={s.resultTitle} accessibilityRole="header">{title}</Text>
      <Text style={s.resultCopy}>{message}</Text>
      <Pressable onPress={onPrimary} accessibilityRole="button" style={({ pressed }) => [s.send, pressed && s.pressed]}>
        <Text style={s.sendText}>{primaryLabel}</Text>
      </Pressable>
      {onSecondary ? (
        <Pressable onPress={onSecondary} accessibilityRole="button" hitSlop={8} style={s.secondary}>
          <Text style={s.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const formatDay = (value) => {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

/**
 * creation: when opened from a creation, its id is attached automatically.
 * Otherwise (profile) the user can pick one of their creations in the form.
 */
export function ReportAbuseSheet({ visible, onClose, contentUrl, context, creation }) {
  const insets = useSafeAreaInsets()
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [picked, setPicked] = useState(null)
  const [creations, setCreations] = useState(null)
  const [creationsError, setCreationsError] = useState(false)
  const [phase, setPhase] = useState('form')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const target = creation || picked
  const canSend = !!reason && details.trim().length > 0 && !sending

  const loadCreations = async () => {
    if (creation) return
    setCreationsError(false)
    try {
      const { response, body } = await apiJson('/api/mobile/creations')
      if (!response.ok) throw new Error(body.error)
      setCreations((body.creations || []).filter((c) => c.status === 'completed'))
    } catch {
      setCreationsError(true)
      setCreations([])
    }
  }

  const reset = () => {
    setReason(''); setDetails(''); setPicked(null); setCreations(null); setPhase('form'); setError('')
  }

  const close = () => {
    if (sending) return
    reset()
    onClose()
  }

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    setError('')
    try {
      const { response, body } = await apiJson('/api/mobile/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          details: details.trim(),
          creationId: target?.id ? String(target.id) : '',
          contentUrl: contentUrl || target?.playback_url || '',
          context: context || '',
          platform: Platform.OS,
        }),
      })
      if (!response.ok || !body.success) throw new Error(body.error || SEND_ERROR)
      setPhase('success')
    } catch (e) {
      setError(friendlyError(e, SEND_ERROR))
      setPhase('error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} onShow={loadCreations} statusBarTranslucent>
      <KeyboardAvoidingView style={s.sheetWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={s.backdrop} onPress={close} accessibilityLabel="Fermer" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.topBar}>
            <View style={s.handle} />
            <Pressable onPress={close} disabled={sending} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10} style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}>
              <Ionicons name="close" size={20} color={C.ink} />
            </Pressable>
          </View>

          {phase === 'success' ? (
            <SheetResult
              ok
              title="Signalement envoyé"
              message="Merci. Notre équipe de modération va examiner ce contenu."
              primaryLabel="Fermer"
              onPrimary={close}
            />
          ) : phase === 'error' ? (
            <SheetResult
              title="Signalement non envoyé"
              message={error}
              primaryLabel="Réessayer"
              onPrimary={submit}
              secondaryLabel="Modifier le signalement"
              onSecondary={() => setPhase('form')}
            />
          ) : (
            <>
              <Text style={s.sheetTitle} accessibilityRole="header">Signaler un contenu</Text>
              <Text style={s.sheetCopy}>Ton signalement est transmis à l’équipe de modération ChapCam.</Text>
              <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
                <Text style={s.label}>Contenu concerné</Text>
                {creation ? (
                  <CreationChip item={creation} selected />
                ) : creations === null ? (
                  <View style={s.pickerLoading}><ChapCamLoader size="small" /></View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.picker} keyboardShouldPersistTaps="handled">
                    <Pressable
                      onPress={() => setPicked(null)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: !picked }}
                      style={[s.otherChip, !picked && s.chipOn]}
                    >
                      <Ionicons name="help-circle-outline" size={18} color={!picked ? C.white : C.ink} />
                      <Text style={[s.otherChipText, !picked && s.reasonTextOn]}>Autre contenu</Text>
                    </Pressable>
                    {creations.map((item) => (
                      <CreationChip key={item.id} item={item} selected={picked?.id === item.id} onPress={() => setPicked(item)} />
                    ))}
                  </ScrollView>
                )}
                {creationsError ? <Text style={s.hint}>Impossible de charger tes créations. Tu peux décrire le contenu dans les détails.</Text> : null}

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
                  editable={!sending}
                  accessibilityLabel="Détails du signalement"
                />
              </ScrollView>
              <Pressable onPress={submit} disabled={!canSend} accessibilityRole="button" accessibilityState={{ disabled: !canSend, busy: sending }} style={[s.send, !canSend && s.sendOff]}>
                {sending ? <ChapCamLoader size="small" tone="light" /> : <Text style={s.sendText}>Envoyer le signalement</Text>}
              </Pressable>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function CreationChip({ item, selected, onPress }) {
  const title = item.title || 'Création'
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={[s.chip, selected && s.chipOn]}
    >
      <View style={s.thumb}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Ionicons name="film-outline" size={18} color={C.muted} />
        )}
      </View>
      <View style={s.chipText}>
        <Text numberOfLines={1} style={[s.chipTitle, selected && s.reasonTextOn]}>{title}</Text>
        {item.created_at ? <Text numberOfLines={1} style={[s.chipMeta, selected && s.chipMetaOn]}>{formatDay(item.created_at)}</Text> : null}
      </View>
    </Pressable>
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
  sheet: { maxHeight: '88%', backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, gap: 8 },
  topBar: { height: 32, alignItems: 'center', justifyContent: 'center' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line },
  closeBtn: { position: 'absolute', top: 0, right: -4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  sheetTitle: { color: C.ink, fontSize: 19, fontWeight: '900' },
  sheetCopy: { color: C.muted, fontSize: 13, lineHeight: 19 },
  sheetScroll: { flexGrow: 0 },
  label: { color: C.ink, fontSize: 13, fontWeight: '800', marginTop: 10, marginBottom: 8 },
  hint: { color: C.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  pickerLoading: { height: 56, alignItems: 'center', justifyContent: 'center' },
  picker: { gap: 8, paddingRight: 4 },
  chip: { width: 170, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  chipOn: { backgroundColor: C.ink, borderColor: C.ink },
  thumb: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: C.line },
  chipText: { flex: 1, gap: 1 },
  chipTitle: { color: C.ink, fontSize: 13, fontWeight: '800' },
  chipMeta: { color: C.muted, fontSize: 11, fontWeight: '600' },
  chipMetaOn: { color: 'rgba(255,255,255,0.7)' },
  otherChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  otherChipText: { color: C.ink, fontSize: 13, fontWeight: '700' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reason: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg },
  reasonOn: { backgroundColor: C.ink, borderColor: C.ink },
  reasonText: { color: C.ink, fontSize: 13, fontWeight: '700' },
  reasonTextOn: { color: C.white },
  input: { minHeight: 100, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, padding: 12, color: C.ink, fontSize: 15, lineHeight: 21 },
  send: { alignSelf: 'stretch', height: 52, borderRadius: 26, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  sendOff: { opacity: 0.4 },
  sendText: { color: C.white, fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.85 },
  result: { alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 4 },
  resultIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  resultIconOk: { backgroundColor: C.blue },
  resultIconErr: { backgroundColor: C.violet },
  resultTitle: { color: C.ink, fontSize: 19, fontWeight: '900', textAlign: 'center' },
  resultCopy: { color: C.muted, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  secondary: { paddingVertical: 8 },
  secondaryText: { color: C.ink, fontSize: 14, fontWeight: '800' },
})
