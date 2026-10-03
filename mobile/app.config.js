// src/lib/supabase.js throws at launch without these, so a build missing them
// would ship an app that quits immediately. Fail the EAS build instead.
const REQUIRED_BUILD_ENV = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY']

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
  ],
  extra: {
    ...config.extra,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL || 'https://chapcam.com',
  },
})
