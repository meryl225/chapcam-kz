import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Identifiant utilisateur issu de la session Supabase (la même que chapcam.com).
 * Toutes les requêtes Neon sont cloisonnées par cet identifiant.
 */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized')
    this.name = 'UnauthorizedError'
  }
}

export async function requireUserId(): Promise<string> {
  const id = await getUserId()
  if (!id) throw new UnauthorizedError()
  return id
}
