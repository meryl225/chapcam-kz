import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { ChapCamLoader } from './src/ui/ChapCamLoader'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'
import { clearAccountSummaryCache } from './src/lib/accountSummary'
import { AuthScreen } from './src/auth/AuthScreen'
import { AuthenticatedHome } from './src/auth/AuthenticatedHome'

// Keep the native launch screen up until the session is known, so the app opens
// straight on Home or Login instead of flashing an extra loader.
SplashScreen.preventAutoHideAsync().catch(() => {})

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session)
        setLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT' || !nextSession) clearAccountSummaryCache()
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {})
  }, [loading])

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.safe}>
        <StatusBar style="dark" />
        {loading ? <View style={styles.loading}><ChapCamLoader size="large" /></View> : session?.user ? <AuthenticatedHome user={session.user} /> : <AuthScreen />}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#070c18' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#070c18' },
})
