// Same cyberpunk pool and djb2 hash as lib/user-avatar.ts on chapcam.com, so a user keeps
// the same avatar on the web and on iOS. Images are bundled (256px) to work offline.
const AVATAR_POOL = [
  require('../../assets/avatars/cyber-1.png'),
  require('../../assets/avatars/cyber-2.png'),
  require('../../assets/avatars/cyber-3.png'),
  require('../../assets/avatars/cyber-4.png'),
  require('../../assets/avatars/cyber-5.png'),
  require('../../assets/avatars/cyber-6.png'),
]

function hashString(input) {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return Math.abs(hash)
}

export function getUserAvatar(seed) {
  if (!seed) return AVATAR_POOL[0]
  return AVATAR_POOL[hashString(String(seed)) % AVATAR_POOL.length]
}

export function getUserPhotoUrl(user) {
  return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
}

export function getUserAvatarSource(user) {
  return getUserAvatar(user?.id || user?.email)
}
