import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// Pays proposés pour le proxy résidentiel. Garder synchronisé avec la page.
const SUPPORTED = new Set(['FR', 'US', 'CI', 'GB', 'CA'])

// Hôte proxy par pays (données factices : le vrai fournisseur sera branché ensuite).
function hostFor(country: string) {
  return `${country.toLowerCase()}.proxy.chapcam.com`
}

/**
 * Active (ou récupère) un abonnement proxy pour un pays donné.
 * - Auth obligatoire ; chaque ligne est isolée par RLS (auth.uid() = user_id).
 * - Si l'abonnement existe déjà pour ce pays, on renvoie les mêmes identifiants
 *   (idempotent) ; sinon on en génère de nouveaux.
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

  let country = ''
  try {
    const body = await req.json()
    country = String(body?.country ?? '').toUpperCase()
  } catch {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  }

  if (!SUPPORTED.has(country)) {
    return NextResponse.json({ error: 'Pays non disponible' }, { status: 400 })
  }

  // Identifiants déjà générés pour ce pays ? On les renvoie tels quels.
  const { data: existing } = await supabase
    .from('proxy_subscriptions')
    .select('country, host, port, username, password_encrypted, quota_gb, used_gb, status')
    .eq('user_id', user.id)
    .eq('country', country)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ credentials: serialize(existing) })
  }

  // Génère des identifiants factices mais stables pour ce pays.
  const username = `chapcam-${user.id.slice(0, 8)}-${country.toLowerCase()}`
  const password = randomBytes(9).toString('base64url')

  const row = {
    user_id: user.id,
    country,
    host: hostFor(country),
    port: '8080',
    username,
    password_encrypted: password,
    quota_gb: 10,
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

  return NextResponse.json({ credentials: serialize(inserted) })
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

// On expose le mot de passe au client (champ "encrypted" = factice pour l'instant).
function serialize(r: Row) {
  return {
    country: r.country,
    host: r.host,
    port: r.port,
    username: r.username,
    password: r.password_encrypted,
    quotaGb: Number(r.quota_gb),
    usedGb: Number(r.used_gb),
    status: r.status,
  }
}
