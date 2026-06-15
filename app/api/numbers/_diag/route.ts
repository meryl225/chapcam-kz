import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Diagnostic temporaire : vérifie l'authentification des 3 fournisseurs.
// À SUPPRIMER après vérification.
export async function GET() {
  const out: Record<string, unknown> = {}

  // 5sim
  try {
    const r = await fetch('https://5sim.net/v1/user/profile', {
      headers: { Authorization: `Bearer ${process.env.FIVESIM_API_KEY ?? ''}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    const t = await r.text()
    out.fivesim = { status: r.status, ok: r.ok, sample: t.slice(0, 120) }
  } catch (e) {
    out.fivesim = { error: (e as Error).message }
  }

  // sms-man
  try {
    const r = await fetch(`https://api.sms-man.com/control/get-balance?token=${process.env.SMSMAN_API_TOKEN ?? ''}`, {
      cache: 'no-store',
    })
    const t = await r.text()
    out.smsman = { status: r.status, sample: t.slice(0, 120) }
  } catch (e) {
    out.smsman = { error: (e as Error).message }
  }

  // smspool
  try {
    const fd = new FormData()
    fd.append('key', process.env.SMSPOOL_API_KEY ?? '')
    const r = await fetch('https://api.smspool.net/request/balance', { method: 'POST', body: fd, cache: 'no-store' })
    const t = await r.text()
    out.smspool = { status: r.status, sample: t.slice(0, 120) }
  } catch (e) {
    out.smspool = { error: (e as Error).message }
  }

  return NextResponse.json(out)
}
