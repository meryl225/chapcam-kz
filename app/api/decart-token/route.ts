import { createDecartClient } from '@decartai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveWatermarkForUser, getDecartApiKeyCandidates } from '@/lib/watermark'
import { checkLiveAccess } from '@/lib/live-guard'
import { trackGPUUsage } from '@/lib/rate-limit'
import { RESERVATION_SECONDS, RESERVATION_POINTS } from '@/lib/swap-pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // 1. Verifier que l'utilisateur est authentifie
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.id) {
    return NextResponse.json(
      { error: 'Non authentifie. Connecte-toi pour utiliser le swap.' },
      { status: 401 }
    )
  }

  // 2. VERROU CRITIQUE : verifier COTE SERVEUR que l'utilisateur a un abonnement
  //    actif et assez de points AVANT d'emettre un token. Sans ce controle, un
  //    compte a 0 point ou expire pouvait obtenir un token et bruler du GPU
  //    Decart sans jamais etre facture (la facturation etant pilotee client).
  const access = await checkLiveAccess(user.id)
  if (!access.allowed) {
    const msg =
      access.reason === 'insufficient_points'
        ? 'Points insuffisants. Recharge ton compte pour utiliser le swap.'
        : access.reason === 'expired'
          ? 'Ton abonnement a expire et le delai pour utiliser tes points restants est depasse. Renouvelle pour continuer.'
          : "Aucun abonnement actif. Souscris ou recharge pour utiliser le swap."
    console.warn(
      `[Decart Token] REFUS user=${user.id} reason=${access.reason} ` +
      `points=${access.points} plan=${access.plan}`
    )
    return NextResponse.json({ error: msg, code: access.reason }, { status: 402 })
  }

  // 3. Garde-fou anti-abus : plafond quotidien de GPU par compte (2h/jour).
  //    Lecture seule (0s) pour bloquer un compte deja au plafond.
  const gpu = trackGPUUsage(user.id, 0)
  if (!gpu.allowed) {
    console.warn(`[Decart Token] CAP quotidien atteint user=${user.id} used=${gpu.totalUsed}s`)
    return NextResponse.json(
      { error: 'Limite quotidienne de swap atteinte (2h). Reessaie demain.', code: 'daily_cap' },
      { status: 429 }
    )
  }

  // 4. Choisir la/les cle(s) Decart selon le forfait (avec/sans watermark).
  //    Toute la decision est cote serveur : le client ne choisit jamais sa cle.
  //    On recupere une LISTE ordonnee : la cle ideale d'abord, puis l'autre cle
  //    en repli. Si la 1ere est invalide/expiree, on essaiera la suivante plutot
  //    que de renvoyer un service indisponible (voir la boucle en 5.).
  const decision = await resolveWatermarkForUser(user.id)
  const keyCandidates = getDecartApiKeyCandidates(decision.noWatermark)

  if (keyCandidates.length === 0) {
    console.error('[Decart Token] Aucune cle Decart configuree (DECART_API_KEY / DECART_API_KEY_NO_WATERMARK)')
    return NextResponse.json(
      { error: 'Service temporairement indisponible' },
      { status: 500 }
    )
  }

  // 4.b Construire la liste des origines autorisees pour le token Decart.
  //     Decart rejette la connexion ("Origin not allowed") si l'origine reelle
  //     du navigateur n'est pas listee ici. En plus des domaines de prod, on
  //     ajoute DYNAMIQUEMENT l'origine de la requete courante : cela couvre les
  //     previews Vercel (*.vercel.app), l'apercu v0 et tout autre domaine sur
  //     lequel l'app est reellement servie. C'est sur : le token n'est emis qu'a
  //     un utilisateur authentifie, servi depuis cette meme origine.
  const allowedOrigins = new Set<string>([
    'https://chapcam.com',
    'https://www.chapcam.com',
    'http://localhost:3000', // Dev only
  ])
  // Origine reelle de la page qui ouvrira le WebSocket Decart. On la determine
  // dans cet ordre de fiabilite :
  //   1. Le parametre ?origin= envoye par le client (= window.location.origin).
  //      C'est la source la plus fiable car c'est exactement l'origine que le
  //      navigateur mettra dans l'en-tete Origin du WebSocket. Indispensable
  //      pour les previews v0/Vercel servis dans une iframe sandbox, ou l'origine
  //      de la page differe du host vu cote serveur.
  //   2. L'en-tete Origin de la requete (souvent absent sur un GET same-origin).
  //   3. Le host de forwarding derriere le proxy Vercel.
  const hdrs = request.headers
  const url = new URL(request.url)
  const clientOriginParam = url.searchParams.get('origin')
  // Identifiant de session genere par le client AVANT connect() : c'est la meme
  // cle que les heartbeats /api/points utiliseront. On l'attache a la ligne de
  // reservation ci-dessous pour que warmup + swap actif se cumulent sur UNE
  // seule ligne swap_sessions.
  const clientSessionId = url.searchParams.get('sessionId')
  const originHeader = hdrs.get('origin')
  const forwardedHost = hdrs.get('x-forwarded-host') || hdrs.get('host')
  const forwardedProto = hdrs.get('x-forwarded-proto') || 'https'
  const candidateOrigins = [
    clientOriginParam,
    originHeader,
    forwardedHost ? `${forwardedProto}://${forwardedHost}` : null,
  ]
  let requestOrigin: string | null = null
  for (const candidate of candidateOrigins) {
    if (!candidate) continue
    try {
      // Normaliser (schema + host uniquement, sans chemin ni slash final).
      const normalized = new URL(candidate).origin
      allowedOrigins.add(normalized)
      if (!requestOrigin) requestOrigin = normalized
    } catch {
      // Candidat non parsable : on l'ignore.
    }
  }

  try {
    // 5. Creer un token ephemere avec restrictions.
    //    On essaie les cles candidates dans l'ordre : cle ideale, puis repli.
    //    Une cle invalide/expiree (ex: DECART_API_KEY qui a expire) ne casse
    //    donc plus le swap tant qu'UNE cle valide reste configuree.
    let token: any = null
    let usedNoWatermark = false
    let lastErr: any = null
    for (let i = 0; i < keyCandidates.length; i++) {
      const cand = keyCandidates[i]
      try {
        const client = createDecartClient({ apiKey: cand.apiKey })
        token = await client.tokens.create({
          expiresIn: 300, // 5 min : reduit de moitie l'exposition GPU si le client cesse de
                          // synchroniser, sans casser les usages tardifs (upload avatar,
                          // changement de scene) qui reutilisent ce token pendant la session.
          allowedModels: ['lucy-2.5', 'lucy-2.1'],
          allowedOrigins: Array.from(allowedOrigins),
          metadata: {
            userId: user.id,
            userEmail: user.email,
            noWatermark: cand.usedNoWatermark,
            createdAt: new Date().toISOString()
          }
        })
        usedNoWatermark = cand.usedNoWatermark
        break
      } catch (candErr: any) {
        lastErr = candErr
        console.error(
          `[Decart Token] Echec creation token avec cle #${i + 1}/${keyCandidates.length} ` +
          `(noWatermark=${cand.usedNoWatermark}): ${candErr?.message || candErr}` +
          (i < keyCandidates.length - 1 ? ' -> tentative avec la cle de repli' : '')
        )
      }
    }

    // Toutes les cles ont echoue : vraie indisponibilite du service Decart.
    if (!token) {
      throw lastErr || new Error('Aucune cle Decart valide')
    }

    console.log(
      `[Decart Token] Token cree pour user ${user.id} | plan=${decision.plan || 'none'} | ` +
      `points=${access.points} | noWatermark=${usedNoWatermark} (${decision.reason}) | ` +
      `origin=${requestOrigin || 'inconnue'}`
    )

    // 6. Journaliser l'emission pour la reconciliation avec Decart (best-effort :
    //    ne bloque jamais le swap si la table n'existe pas encore). Voir
    //    scripts/decart-token-logs.sql pour creer la table cote Supabase.
    try {
      const admin = createAdminClient()
      await admin.from('decart_token_logs').insert({
        user_id: user.id,
        email: user.email,
        plan: decision.plan || null,
        no_watermark: usedNoWatermark,
        points_at_issue: access.points,
        expires_at: token.expiresAt,
        created_at: new Date().toISOString(),
      })
    } catch (logErr: any) {
      console.warn('[Decart Token] Log non enregistre:', logErr?.message)
    }

    // 7. RESERVATION DE WARMUP (anti sessions "fantomes").
    //    Le token est cree => Decart a provisionne le GPU et facturera au minimum
    //    le warmup/connexion. On debite donc immediatement un forfait de warmup
    //    et on cree la ligne swap_sessions correspondante (finalized=false), avec
    //    le meme session_id que les heartbeats. Ainsi, meme si le client meurt
    //    pendant la connexion (0 heartbeat), la conso est deja facturee et
    //    tracee. Les heartbeats s'ajouteront ensuite sur CETTE meme ligne.
    //    Best-effort : une erreur ici ne bloque jamais le demarrage du swap.
    if (clientSessionId) {
      try {
        const admin = createAdminClient()
        const { data: sub } = await admin
          .from('subscriptions')
          .select('id, points')
          .eq('user_id', user.id)
          .single()
        if (sub) {
          const current = sub.points || 0
          // Ne jamais debiter plus que le solde disponible.
          const reserve = Math.min(RESERVATION_POINTS, current)
          if (reserve > 0) {
            await admin
              .from('subscriptions')
              .update({ points: current - reserve, updated_at: new Date().toISOString() })
              .eq('id', sub.id)
          }
          const nowIso = new Date().toISOString()
          await admin.from('swap_sessions').insert({
            session_id: clientSessionId,
            user_id: user.id,
            avatar_id: null,
            avatar_name: null,
            duration_seconds: RESERVATION_SECONDS,
            points_used: reserve,
            frames_processed: 0,
            started_at: nowIso,
            ended_at: nowIso,
            finalized: false,
            updated_at: nowIso,
          })
        }
      } catch (resErr: any) {
        console.warn('[Decart Token] Reservation warmup non enregistree:', resErr?.message)
      }
    }

    return NextResponse.json({
      success: true,
      token: token.apiKey,
      expiresAt: token.expiresAt,
      userId: user.id,
      noWatermark: usedNoWatermark,
      // Points reserves pour le warmup : le client peut ainsi refleter le solde
      // a jour immediatement (avant le 1er heartbeat).
      reservedPoints: clientSessionId ? RESERVATION_POINTS : 0,
    })
  } catch (error: any) {
    console.error('[Decart Token] Error:', error.message)
    return NextResponse.json(
      { error: 'Impossible de demarrer le swap. Reessaie.', details: error.message },
      { status: 500 }
    )
  }
}
