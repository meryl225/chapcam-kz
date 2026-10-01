import { registerGlobals } from '@livekit/react-native'

// WebRTC, streams and URL globals must exist before the Decart SDK (and the
// livekit-client it bundles) is evaluated, so the SDK is required lazily below.
registerGlobals()

export { mediaDevices, RTCView } from '@livekit/react-native-webrtc'

export function loadDecart() {
  return require('@decartai/sdk')
}

export function newSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}
