import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { Text } from '../i18n/Text'

// In a release build an uncaught render error closes the app ("ChapCam a cessé").
// This keeps the process alive, logs the real error and lets the user remount the tree.
export class AppErrorBoundary extends React.Component {
  state = { error: null, attempt: 0 }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ChapCam] render crash', error?.message, info?.componentStack)
  }

  retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))

  render() {
    if (!this.state.error) {
      return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>
    }
    return (
      <View style={styles.root} accessibilityRole="alert">
        <Text style={styles.title}>Un problème est survenu</Text>
        <Text style={styles.body}>ChapCam a rencontré une erreur sur cet écran. Tes créations et ton solde ne sont pas affectés.</Text>
        <Pressable accessibilityRole="button" onPress={this.retry} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <Text style={styles.buttonText}>Réessayer</Text>
        </Pressable>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070c18', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  title: { color: '#ffffff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  body: { color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  button: { marginTop: 8, backgroundColor: '#4f46e5', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 999 },
  pressed: { opacity: 0.85 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
})
