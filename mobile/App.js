import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { BootSplash } from './src/ui/BootSplash'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'
import { clearAccountSummaryCache } from './src/lib/accountSummary'
import { AuthScreen } from './src/auth/AuthScreen'
import { AuthenticatedHome } from './src/auth/AuthenticatedHome'
import { AppErrorBoundary } from './src/ui/AppErrorBoundary'

// Keep the static native launch screen up until BootSplash has drawn the identical logo,
// then BootSplash animates the light until the session is known.
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

  const [bootVisible, setBootVisible] = useState(true)
  const hideNativeSplash = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {})
  }, [])
  const handleBootExited = useCallback(() => setBootVisible(false), [])

  // Safety net: if the boot screen never reported its logo as drawn, still release the native splash once auth is known.
  useEffect(() => {
    if (!loading) hideNativeSplash()
  }, [loading, hideNativeSplash])

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={styles.safe}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <AppErrorBoundary>
          {loading ? null : session?.user ? <AuthenticatedHome user={session.user} /> : <AuthScreen />}
        </AppErrorBoundary>
        {bootVisible ? <BootSplash exiting={!loading} onReady={hideNativeSplash} onExited={handleBootExited} /> : null}
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#070c18' },
})
