import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../lib/supabase'

export function AuthenticatedHome({ user }) {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>CHAPCAM</Text>
      <Text style={styles.title}>Ton espace est prêt.</Text>
      <Text style={styles.email}>{user.email}</Text>
      <View style={styles.card}><Text style={styles.cardTitle}>Compte connecté</Text><Text style={styles.cardText}>La session est stockée de manière sécurisée sur cet iPhone. Les abonnements, crédits et minutes resteront liés à ce même compte ChapCam.</Text></View>
      <Pressable onPress={() => supabase.auth.signOut()} style={styles.button}><Text style={styles.buttonText}>Se déconnecter</Text></Pressable>
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#070c18' },
  eyebrow: { color: '#00e887', fontSize: 13, fontWeight: '800', letterSpacing: 2, marginBottom: 14 },
  title: { color: '#eef2fb', fontSize: 36, fontWeight: '900', marginBottom: 8 },
  email: { color: '#aab7cd', fontSize: 16, marginBottom: 28 },
  card: { backgroundColor: '#101a2b', borderColor: '#1d2a40', borderWidth: 1, borderRadius: 18, padding: 18, marginBottom: 18 },
  cardTitle: { color: '#eef2fb', fontSize: 17, fontWeight: '800', marginBottom: 8 },
  cardText: { color: '#8d9bb4', fontSize: 15, lineHeight: 23 },
  button: { minHeight: 52, borderRadius: 14, borderColor: '#2a3852', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#eef2fb', fontWeight: '700' },
})
