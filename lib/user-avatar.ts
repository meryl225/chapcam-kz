// Pool d'avatars cyberpunk ChapCam.
// Chaque utilisateur reçoit un avatar fixe et unique, calculé à partir de son identifiant.
const AVATAR_POOL = [
  "/dashboard/avatars/cyber-1.png",
  "/dashboard/avatars/cyber-2.png",
  "/dashboard/avatars/cyber-3.png",
  "/dashboard/avatars/cyber-4.png",
  "/dashboard/avatars/cyber-5.png",
  "/dashboard/avatars/cyber-6.png",
]

// Hash déterministe simple (djb2) -> même entrée = toujours le même index.
function hashString(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  return Math.abs(hash)
}

/**
 * Retourne l'avatar attribué à un utilisateur de façon stable.
 * @param seed identifiant stable de l'utilisateur (id, email, etc.)
 */
export function getUserAvatar(seed?: string | null): string {
  if (!seed) return AVATAR_POOL[0]
  return AVATAR_POOL[hashString(seed) % AVATAR_POOL.length]
}
