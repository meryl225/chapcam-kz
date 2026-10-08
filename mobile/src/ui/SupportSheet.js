import React, { useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { apiJson, friendlyError } from '../lib/api'
import { C } from './catalog'

export function SupportSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const canSend = message.trim().length > 0 && !sending

  const close = () => {
    if (sending) return
    setMessage('')
    onClose()
  }

  const submit = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const { response, body } = await apiJson('/api/mobile/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), platform: Platform.OS }),
      })
      if (!response.ok) throw new Error(body.error || 'Envoi impossible. Réessaie dans un instant.')
      setMessage('')
      onClose()
      Alert.alert('Message envoyé', 'Merci. Le service client ChapCam te répondra par e-mail.')
    } catch (e) {
      Alert.alert('Service client', friendlyError(e, 'Envoi impossible. Réessaie dans un instant.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={s.backdrop} onPress={close} accessibilityLabel="Fermer" />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.topBar}>
            <View style={s.handle} />
            <Pressable onPress={close} disabled={sending} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10} style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}>
              <Ionicons name="close" size={20} color={C.ink} />
            </Pressable>
          </View>
          <View style={s.header}>
            <View style={s.icon}>
              <Ionicons name="headset-outline" size={22} color={C.blue} />
            </View>
            <View style={s.headerText}>
              <Text style={s.title} accessibilityRole="header">Service client</Text>
              <Text style={s.copy}>Décris ta demande, notre équipe te répond par e-mail.</Text>
            </View>
          </View>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Comment pouvons-nous t’aider ?"
            placeholderTextColor={C.muted}
            multiline
            maxLength={4000}
            textAlignVertical="top"
            style={s.input}
            accessibilityLabel="Message pour le service client"
            editable={!sending}
          />
          <Pressable
            onPress={submit}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSend }}
            style={({ pressed }) => [s.send, !canSend && s.sendOff, pressed && s.pressed]}
          >
            {sending ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Ionicons name="send" size={16} color={C.white} />
                <Text style={s.sendText}>Envoyer</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,18,53,0.45)' },
  sheet: { gap: 16, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: C.white },
  topBar: { height: 32, alignItems: 'center', justifyContent: 'center' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line },
  closeBtn: { position: 'absolute', top: 0, right: -4, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.softBlue },
  headerText: { flex: 1, gap: 2 },
  title: { color: C.ink, fontSize: 19, fontWeight: '900' },
  copy: { color: C.muted, fontSize: 14, lineHeight: 20 },
  input: { minHeight: 140, maxHeight: 240, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.bg, color: C.ink, fontSize: 15, lineHeight: 22 },
  send: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, backgroundColor: C.blue },
  sendOff: { opacity: 0.45 },
  sendText: { color: C.white, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.85 },
})
