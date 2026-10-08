import { Alert } from 'react-native'
import * as WebBrowser from 'expo-web-browser'

// Opens chapcam.com pages in an in-app sheet so the user never leaves ChapCam.
export const openInApp = async (url) => {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'close',
      controlsColor: '#2F5BFF',
    })
  } catch {
    Alert.alert('Lien indisponible', "Impossible d'ouvrir cette page pour le moment.")
  }
}
