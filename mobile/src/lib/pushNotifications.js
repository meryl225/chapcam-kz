import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { apiFetch } from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

let registeredToken = null

function easProjectId() {
  return Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId ?? null
}

// Asks only while the iOS permission is still undetermined: a refusal is final
// and is never re-prompted. Returns the Expo token once saved on the server.
export async function registerForPushNotifications() {
  if ((Platform.OS !== 'ios' && Platform.OS !== 'android') || !Device.isDevice) return null

  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync('default', {
      name: 'ChapCam',
      importance: Notifications.AndroidImportance.HIGH,
    })
  }

  let { status } = await Notifications.getPermissionsAsync()
  if (status === 'undetermined') {
    const request = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    })
    status = request.status
  }
  if (status !== 'granted') return null

  const projectId = easProjectId()
  if (!projectId) return null

  // Android throws here until the FCM credentials are configured in EAS.
  let token
  try {
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
  } catch {
    return null
  }
  const response = await apiFetch('/api/mobile/push-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: Platform.OS }),
  })
  if (!response.ok) return null
  registeredToken = token
  return token
}

// Called before sign-out so the device stops receiving this account's pushes.
export async function unregisterPushToken() {
  if (!registeredToken) return
  const token = registeredToken
  registeredToken = null
  await apiFetch('/api/mobile/push-token', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  }).catch(() => {})
}

export function creationIdFromResponse(response) {
  const data = response?.notification?.request?.content?.data
  return data?.type === 'creation_ready' && data.creationId ? String(data.creationId) : null
}
