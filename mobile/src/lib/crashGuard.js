import { Alert } from 'react-native'

// React error boundaries only catch render errors. An exception thrown inside an onPress handler, a timer
// or a native-module callback reaches ErrorUtils as "fatal", and in a release build RN then terminates the
// process ("ChapCam s'est arrêtée"). Here such errors are still reported (logcat / console) but as non-fatal,
// and the user gets a recoverable message instead of losing the app.
const MAX_KEPT = 20
const ALERT_COOLDOWN_MS = 4000
const recentErrors = []
let installed = false
let lastAlertAt = 0

export function getRecentErrors() {
  return recentErrors.slice()
}

export function installCrashGuard() {
  const errorUtils = global.ErrorUtils
  if (installed || !errorUtils?.setGlobalHandler) return
  installed = true
  const defaultHandler = errorUtils.getGlobalHandler?.()

  errorUtils.setGlobalHandler((error, isFatal) => {
    recentErrors.push({ at: Date.now(), fatal: !!isFatal, message: String(error?.message || error), stack: error?.stack })
    if (recentErrors.length > MAX_KEPT) recentErrors.shift()

    if (__DEV__) {
      defaultHandler?.(error, isFatal)
      return
    }
    console.error('[ChapCam] uncaught', isFatal ? '(fatal downgraded)' : '', error?.message, error?.stack)
    try { defaultHandler?.(error, false) } catch {}

    if (!isFatal) return
    const now = Date.now()
    if (now - lastAlertAt < ALERT_COOLDOWN_MS) return
    lastAlertAt = now
    setTimeout(() => {
      try {
        Alert.alert('Action impossible', 'Cette action n’a pas pu aboutir. ChapCam reste ouverte, tu peux réessayer.')
      } catch {}
    }, 0)
  })
}
