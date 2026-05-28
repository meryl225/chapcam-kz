import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Client admin (service_role) pour le projet ChapCam.
// A utiliser UNIQUEMENT cote serveur (route handlers). Ne jamais importer cote client.
const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'

export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante. Ajoute la cle service_role du projet ojmzqokffbptmcktnwdy dans les variables d\'environnement.')
  }

  return createSupabaseClient(SUPABASE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
