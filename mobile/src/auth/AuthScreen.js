import React, { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { BRAND, C, shadow } from '../ui/catalog'
import { ChapCamBrand } from '../ui/ChapCamBrand'

export function AuthScreen() {
  return (
    <SafeAreaProvider>
      <AuthContent />
    </SafeAreaProvider>
  )
}

function AuthContent() {
  const insets = useSafeAreaInsets()
  const passwordRef = useRef(null)
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focused, setFocused] = useState(null)
  const [message, setMessage] = useState('')
  const [messageTone, setMessageTone] = useState('error')
  const [loading, setLoading] = useState(false)

  const isSignIn = mode === 'signIn'

  async function submit() {
    if (loading) return
    setMessage('')
    setMessageTone('error')
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || password.length < 6) {
      setMessage('Entre un e-mail valide et un mot de passe de 6 caractères minimum.')
      return
    }
    setLoading(true)
    const result = mode === 'signIn'
      ? await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      : await supabase.auth.signUp({ email: normalizedEmail, password })
    setLoading(false)
    if (result.error) {
      setMessage(result.error.message.toLowerCase().includes('confirm')
        ? 'Confirme ton adresse e-mail avant de te connecter.'
        : 'Impossible de se connecter avec ces identifiants.')
      return
    }
    if (mode === 'signUp' && !result.data.session) {
      setMessageTone('success')
      setMessage('Compte créé. Vérifie ton e-mail pour confirmer ton adresse.')
    }
  }

  function toggleMode() {
    setMode(isSignIn ? 'signUp' : 'signIn')
    setMessage('')
  }

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 },
          ]}
        >
          <ChapCamBrand />

          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {isSignIn ? 'Bienvenue' : 'Crée ton compte'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignIn
                ? 'Connecte-toi à ton compte ChapCam.'
                : 'Un seul compte pour tes outils IA, tes crédits et ton abonnement.'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>E-mail</Text>
            <View style={[styles.field, focused === 'email' && styles.fieldFocused]}>
              <Ionicons name="mail-outline" size={18} color={focused === 'email' ? C.blue : C.muted} />
              <TextInput
                accessibilityLabel="E-mail"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                placeholder="nom@exemple.com"
                placeholderTextColor="#A6AEC4"
                returnKeyType="next"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={() => passwordRef.current?.focus()}
                style={styles.input}
              />
            </View>

            <Text style={[styles.label, styles.labelSpaced]}>Mot de passe</Text>
            <View style={[styles.field, focused === 'password' && styles.fieldFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={focused === 'password' ? C.blue : C.muted} />
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Mot de passe"
                autoCapitalize="none"
                autoComplete={isSignIn ? 'password' : 'new-password'}
                autoCorrect={false}
                placeholder="6 caractères minimum"
                placeholderTextColor="#A6AEC4"
                returnKeyType="go"
                secureTextEntry={!showPassword}
                textContentType={isSignIn ? 'password' : 'newPassword'}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                onSubmitEditing={submit}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                hitSlop={10}
                onPress={() => setShowPassword((value) => !value)}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
              </Pressable>
            </View>

            {message ? (
              <View
                accessibilityLiveRegion="polite"
                style={[styles.message, messageTone === 'success' ? styles.messageSuccess : styles.messageError]}
              >
                <Ionicons
                  name={messageTone === 'success' ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={messageTone === 'success' ? C.blue : '#D93A50'}
                />
                <Text style={[styles.messageText, messageTone === 'success' ? styles.messageTextSuccess : styles.messageTextError]}>
                  {message}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: loading, busy: loading }}
              disabled={loading}
              onPress={submit}
              style={({ pressed }) => [styles.primaryWrap, pressed && styles.pressed]}
            >
              <LinearGradient colors={BRAND} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.primary}>
                {loading ? (
                  <ChapCamLoader size="small" tone="light" />
                ) : (
                  <Text style={styles.primaryText}>{isSignIn ? 'Se connecter' : 'Créer le compte'}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchHint}>{isSignIn ? 'Nouveau sur ChapCam ?' : 'Déjà un compte ?'}</Text>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={toggleMode}>
              <Text style={styles.switchText}>{isSignIn ? 'Créer un compte' : 'Se connecter'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...shadow },
  wordmark: { color: C.ink, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  header: { marginTop: 40, marginBottom: 24, gap: 8 },
  title: { color: C.ink, fontSize: 34, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: C.muted, fontSize: 16, lineHeight: 23 },
  card: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow,
  },
  label: { color: C.ink, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  labelSpaced: { marginTop: 16 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: '#F8FAFF',
  },
  fieldFocused: { borderColor: C.blue, backgroundColor: C.white },
  input: { flex: 1, color: C.ink, fontSize: 16, paddingVertical: 14 },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14, padding: 12, borderRadius: 12 },
  messageError: { backgroundColor: '#FDEEF0' },
  messageSuccess: { backgroundColor: '#EAF1FF' },
  messageText: { flex: 1, fontSize: 14, lineHeight: 20 },
  messageTextError: { color: '#B42338' },
  messageTextSuccess: { color: C.ink },
  primaryWrap: { marginTop: 20, borderRadius: 16, overflow: 'hidden' },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  primary: { minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  primaryText: { color: C.white, fontSize: 17, fontWeight: '700', letterSpacing: 0.1 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24 },
  switchHint: { color: C.muted, fontSize: 15 },
  switchText: { color: C.blue, fontSize: 15, fontWeight: '700' },
})
