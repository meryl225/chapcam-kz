import { Alert } from 'react-native'
import { translate } from './index'

// Alerts are native dialogs, so their strings never pass through the translating <Text>.
const nativeAlert = Alert.alert.bind(Alert)
Alert.alert = (title, message, buttons, options) =>
  nativeAlert(
    translate(title),
    translate(message),
    Array.isArray(buttons) ? buttons.map((button) => (button && button.text ? { ...button, text: translate(button.text) } : button)) : buttons,
    options,
  )
