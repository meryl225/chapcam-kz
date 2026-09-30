import React from 'react'
import { Linking, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'

const WEBSITE_URL = 'https://chapcam.com'
const APP_STORE_PAYMENTS_NOTE = 'Les abonnements numériques dans l’app seront proposés via Apple In-App Purchase.'

export default function App() {
  const openWebsite = async (path = '') => {
    await WebBrowser.openBrowserAsync(`${WEBSITE_URL}${path}`)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.mark}><Text style={styles.markText}>C</Text></View>
          <Text style={styles.brand}>Chap<Text style={styles.brandAccent}>Cam</Text></Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CRÉATION VIDÉO IA</Text>
          <Text style={styles.title}>Ton studio créatif, dans ta poche.</Text>
          <Text style={styles.body}>Accède à ton compte ChapCam, retrouve tes créations et ouvre le Live Swap depuis ton iPhone.</Text>
          <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => openWebsite('/auth/login')}>
            <Text style={styles.primaryText}>Se connecter</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => openWebsite('/auth/sign-up')}>
            <Text style={styles.secondaryText}>Créer un compte</Text>
          </Pressable>
        </View>

        <View style={styles.cards}>
          <Feature title="Live Swap" text="Transforme ton apparence en temps réel depuis ton espace ChapCam." />
          <Feature title="Créations vidéo" text="Lance tes outils image-vers-vidéo et retrouve tes rendus au même endroit." />
          <Feature title="Abonnements" text="Les achats numériques iOS seront sécurisés par Apple In-App Purchase." />
        </View>

        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(WEBSITE_URL)}>
          <Text style={styles.footerLink}>Ouvrir chapcam.com</Text>
        </Pressable>
        <Text style={styles.note}>{APP_STORE_PAYMENTS_NOTE}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Feature({ title, text }) {
  return <View style={styles.feature}><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureText}>{text}</Text></View>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#070c18' },
  content: { padding: 24, paddingTop: 48, paddingBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 56 },
  mark: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#00e887', alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#061018', fontWeight: '900', fontSize: 23 },
  brand: { color: '#eef2fb', fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  brandAccent: { color: '#00e887' },
  hero: { marginBottom: 30 },
  eyebrow: { color: '#00e887', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 14 },
  title: { color: '#eef2fb', fontSize: 43, lineHeight: 47, fontWeight: '900', letterSpacing: -1.5, marginBottom: 18 },
  body: { color: '#aab7cd', fontSize: 17, lineHeight: 27, marginBottom: 28 },
  primaryButton: { backgroundColor: '#00e887', minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  primaryText: { color: '#061018', fontSize: 16, fontWeight: '800' },
  secondaryButton: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#2a3852', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#eef2fb', fontSize: 16, fontWeight: '700' },
  cards: { gap: 12, marginBottom: 30 },
  feature: { backgroundColor: '#101a2b', borderRadius: 18, borderWidth: 1, borderColor: '#1d2a40', padding: 18 },
  featureTitle: { color: '#eef2fb', fontSize: 17, fontWeight: '800', marginBottom: 7 },
  featureText: { color: '#8d9bb4', fontSize: 14, lineHeight: 21 },
  footerLink: { color: '#00e887', textAlign: 'center', fontWeight: '700', marginBottom: 12 },
  note: { color: '#66738b', fontSize: 11, textAlign: 'center', lineHeight: 17 }
})
