import { NextResponse } from 'next/server'

// IMPORTANT : cette route NE verifie PLUS le token cote serveur.
//
// Pourquoi ? Deux raisons critiques :
//  1) Verifier un token de recuperation sur un GET serveur le "consomme". Or
//     WhatsApp, Gmail et les antivirus PRE-OUVRENT les liens pour generer un
//     apercu -> le jeton a usage unique etait brule avant le vrai clic
//     (erreur "otp_expired" / "Auth session missing").
//  2) Les liens PKCE (token prefixe "pkce_") exigent un cookie "code verifier"
//     present uniquement dans le navigateur d'origine -> echec cross-device
//     (lien ouvert sur telephone, autre navigateur...) et 500 cote serveur.
//
// La verification est donc faite cote NAVIGATEUR (JS) sur /auth/reset-password :
// les bots d'apercu n'executent pas de JS, le jeton n'est donc jamais consomme
// avant le vrai clic de l'utilisateur. Cette route se contente de transferer
// tous les parametres (token_hash, type, code, erreurs) vers cette page.
export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)

    // Le "next" historique pointait vers /auth/update-password ; on force
    // desormais la page cliente unique /auth/reset-password qui gere tout.
    const target = new URL('/auth/reset-password', origin)

    // On recopie tous les parametres utiles tels quels.
    for (const key of ['token_hash', 'type', 'code', 'error', 'error_code', 'error_description']) {
      const value = searchParams.get(key)
      if (value) target.searchParams.set(key, value)
    }

    return NextResponse.redirect(target.toString())
  } catch {
    // En dernier recours, on renvoie vers la page de reset qui affichera
    // proprement l'ecran "lien expire" + renvoi.
    const { origin } = new URL(request.url)
    return NextResponse.redirect(`${origin}/auth/reset-password?error_code=invalid`)
  }
}
