import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/admin-email'

export { ADMIN_EMAIL }

// Verifie que la requete provient bien de l'admin connecte.
// Le middleware ne protege PAS les routes /api/admin (il retourne tot
// pour la plupart des routes API), donc chaque route admin doit appeler ceci.
export async function isAdminRequest(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return !!user && user.email === ADMIN_EMAIL
  } catch {
    return false
  }
}
