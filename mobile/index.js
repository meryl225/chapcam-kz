import 'react-native-gesture-handler'
import { registerRootComponent } from 'expo'
import { installCrashGuard } from './src/lib/crashGuard'
import './src/lib/formDataFiles'
import App from './App'

installCrashGuard()
registerRootComponent(App)
