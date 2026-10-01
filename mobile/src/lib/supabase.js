import 'react-native-url-polyfill/auto'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'
import { createClient } from '@supabase/supabase-js'

const expoExtra = Constants.expoConfig?.extra ?? {}
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? expoExtra.supabaseUrl
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? expoExtra.supabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

const secureStorage = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
