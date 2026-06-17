import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { proxyQuotaForPlan } from '@/lib/plans'

// Offres ChapCam Proxy Pro. Garder synchronisé avec la page/le composant.
const PRODUCTS = new Set(['RESIDENTIAL', 'ISP', 'MOBILE'])

function hostFor(product: string) {
  return `${product.toLowerCase()}.proxypro.chapcam.com`
}

/**
 * Active (ou récupère) une offre ChapCam Proxy Pro (résidentiel / ISP / mobile).
 * - Auth obligatoire ; chaque ligne est isolée par RLS (auth.uid() = user_id).
 * - Forfait actif requis (le quota proxy est dimensionné par le forfait).
 * - Idempotent : si l'offre existe déjà, on renvoie les mêmes identifiants.
 * On réutilise la table proxy_subscriptions ; la colonne `country` sert ici de
 * clé de produit (RESIDENTIAL / ISP / MOBILE), unique par utilisateur.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  let product = ''
  try {
    const body = await req.json()
    product = String(body?.product ?? '').toUpperCase()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  if (!PRODUCTS.has(product)) {
    return NextResponse.json({ error: 'Offre non disponible' }, { status: 400 })
  }

  // Forfait actif obligatoire (sinon pas de quota proxy → service non rentable).
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, is_active, expires_at')
    .eq('user_id', user.id)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const planActive =
    !!subscription?.is_active &&
    (!subscription?.expires_at || new Date(subscription.expires_at) > new Date())
  const quotaGb = planActive ? proxyQuotaForPlan(subscription?.plan) : 0

  if (quotaGb <= 0) {
    return NextResponse.json(
      { error: 'Aucun forfait actif. Souscrivez un forfait pour activer cette offre.' },
      { status: 403 },
    )
  }

  // Offre déjà activée ? On renvoie les identifiants existants.
  const { data: existing } = await supabase
    .from('proxy_subscriptions')
    .select('country, host, port, username, password_encrypted, quota_gb, used_gb, status')
    .eq('user_id', user.id)
    .eq('country', product)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ credentials: serialize(existing, quotaGb) })
  }

  const username = `chapcam-${user.id.slice(0, 8)}-${product.toLowerCase()}`
  const password = randomBytes(9).toString('base64url')

  const row = {
    user_id: user.id,
    country: product,
    host: hostFor(product),
    port: '8080',
    username,
    password_encrypted: password,
    quota_gb: quotaGb,
    used_gb: 0,
    status: 'active' as const,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }

  const { data: inserted, error: insertError } = await supabase
    .from('proxy_subscriptions')
    .insert(row)
    .select('country, host, port, username, password_encrypted, quota_gb, used_gb, status')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json({ error: 'Activation impossible' }, { status: 500 })
  }

  return NextResponse.json({ credentials: serialize(inserted, quotaGb) })
}

type Row = {
  country: string
  host: string | null
  port: string | null
  username: string | null
  password_encrypted: string | null
  quota_gb: number
  used_gb: number
  status: string
}

function serialize(r: Row, quotaGb: number) {
  return {
    product: r.country,
    host: r.host,
    port: r.port,
    username: r.username,
    password: r.password_encrypted,
    quotaGb,
    usedGb: Number(r.used_gb),
    status: r.status,
  }
}
