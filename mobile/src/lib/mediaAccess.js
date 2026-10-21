import { Platform } from 'react-native'
import * as ImagePicker from 'expo-image-picker'

// Android opens the system Photo Picker, which grants access only to the files the
// user selects. The app declares no global photo/video permission there (Google Play
// policy), so asking for one would always be refused and block the import.
export async function requestLibraryAccess() {
  if (Platform.OS === 'android') return { granted: true }
  return ImagePicker.requestMediaLibraryPermissionsAsync()
}
