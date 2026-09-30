import React, { useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../lib/supabase'

export function AuthScreen() {
  const [mode, setMode] = useState('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setMessage('')
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
    if (mode === 'signUp' && !result.data.session) setMessage('Compte créé. Vérifie ton e-mail pour confirmer ton adresse.')
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <Text style={styles.eyebrow}>CHAPCAM</Text>
      <Text style={styles.title}>{mode === 'signIn' ? 'Bienvenue.' : 'Créer ton compte.'}</Text>
      <Text style={styles.subtitle}>Retrouve le même compte, les mêmes abonnements et tes crédits ChapCam.</Text>
      <TextInput autoCapitalize="none" autoCorrect={false} keyboardType="email-address" placeholder="E-mail" placeholderTextColor="#718096" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput secureTextEntry placeholder="Mot de passe" placeholderTextColor="#718096" value={password} onChangeText={setPassword} style={styles.input} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable disabled={loading} onPress={submit} style={styles.primary}>
        {loading ? <ActivityIndicator color="#061018" /> : <Text style={styles.primaryText}>{mode === 'signIn' ? 'Se connecter' : 'Créer le compte'}</Text>}
      </Pressable>
      <Pressable onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setMessage('') }} style={styles.switchButton}>
        <Text style={styles.switchText}>{mode === 'signIn' ? 'Créer un compte' : 'J’ai déjà un compte'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#070c18' },
  eyebrow: { color: '#00e887', fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 14 },
  title: { color: '#eef2fb', fontSize: 38, fontWeight: '900', marginBottom: 12 },
  subtitle: { color: '#aab7cd', fontSize: 16, lineHeight: 24, marginBottom: 28 },
  input: { color: '#eef2fb', backgroundColor: '#101a2b', borderColor: '#263650', borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15, fontSize: 16, marginBottom: 12 },
  message: { color: '#ffb4b4', lineHeight: 20, marginBottom: 14 },
  primary: { minHeight: 54, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#00e887', marginTop: 4 },
  primaryText: { color: '#061018', fontSize: 16, fontWeight: '800' },
  switchButton: { alignItems: 'center', padding: 18 },
  switchText: { color: '#00e887', fontWeight: '700' },
})
