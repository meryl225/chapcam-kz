// src/lib/supabase.js throws at launch without these, so a build missing them
// would ship an app that quits immediately. Fail the EAS build instead.
const REVENUECAT_BUILD_KEY =
  process.env.EAS_BUILD_PLATFORM === 'android' ? 'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY' : 'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'
const REQUIRED_BUILD_ENV = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', REVENUECAT_BUILD_KEY]

if (process.env.EAS_BUILD === 'true') {
  const missing = REQUIRED_BUILD_ENV.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing EAS environment variables: ${missing.join(', ')}. ` +
        `Add them to the "${process.env.EAS_BUILD_PROFILE || 'production'}" EAS environment before building.`
    )
  }
}

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins || []),
    [
      'expo-audio',
      {
        microphonePermission: config.ios?.infoPlist?.NSMicrophoneUsageDescription,
        enableBackgroundPlayback: false,
      },
    ],
    'expo-notifications',
  ],
  extra: {
    ...config.extra,
    // getExpoPushTokenAsync needs the EAS project id; EAS Build injects it.
    ...(process.env.EAS_BUILD_PROJECT_ID || config.extra?.eas?.projectId
      ? { eas: { ...config.extra?.eas, projectId: process.env.EAS_BUILD_PROJECT_ID || config.extra?.eas?.projectId } }
      : {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://chapcam.com',
    revenueCatIosApiKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    revenueCatAndroidApiKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  },
})
