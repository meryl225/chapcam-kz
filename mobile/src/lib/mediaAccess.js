import { Alert, Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'

// Android opens the system Photo Picker, which grants access only to the files the
// user selects. The app declares no global photo/video permission there (Google Play
// policy), so asking for one would always be refused and block the import.
export async function requestLibraryAccess() {
  if (Platform.OS === 'android') return { granted: true }
  return ImagePicker.requestMediaLibraryPermissionsAsync()
}

const CANCELED = { canceled: true, assets: null }
let pickerOpen = false

// A second tap while a system picker is opening launches a second intent: on Android the first
// result is then delivered to a dead promise or the activity result throws. One picker at a time,
// and a failure becomes a message instead of an unhandled error in the calling button.
async function exclusive(launch, failureMessage) {
  if (pickerOpen) return CANCELED
  pickerOpen = true
  try {
    const result = await launch()
    return result || CANCELED
  } catch (error) {
    console.warn('[picker] failed', error?.message)
    Alert.alert('Import impossible', failureMessage)
    return CANCELED
  } finally {
    pickerOpen = false
  }
}

export function launchLibrary(options) {
  return exclusive(() => ImagePicker.launchImageLibraryAsync(options), 'La galerie n’a pas pu s’ouvrir. Réessaie dans un instant.')
}

export function launchCamera(options) {
  return exclusive(() => ImagePicker.launchCameraAsync(options), 'La caméra n’a pas pu s’ouvrir. Vérifie l’autorisation dans les Réglages.')
}

export function pickDocument(options) {
  return exclusive(() => DocumentPicker.getDocumentAsync(options), 'Le fichier n’a pas pu être sélectionné. Réessaie dans un instant.')
}
