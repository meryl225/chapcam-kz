import React, { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context'
import { ChapCamLoader } from './src/ui/ChapCamLoader'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'
import { AuthScreen } from './src/auth/AuthScreen'
import { AuthenticatedHome } from './src/auth/AuthenticatedHome'

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
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

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
