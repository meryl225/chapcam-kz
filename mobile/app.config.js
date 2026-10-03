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
