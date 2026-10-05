import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getJetonsLedger, type JetonsLedgerEntry } from '@/lib/jetons'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

const TOOL_LABELS: Record<string, string> = {
  photo_video: 'Photo en vidéo',
  motion: 'Motion',
  genjutsu: 'Motion',
  higgsfield: 'Motion',
  voice_message: 'Message vocal',
  chapverify: 'ChapVerify',
  translation: 'Traduction vidéo',
  video_translation: 'Traduction vidéo',
}

const REASON_TOOLS: Array<[string, string]> = [
  ['photo_video', 'photo_video'],
  ['translation', 'translation'],
  ['chapverify', 'chapverify'],
  ['genjutsu', 'genjutsu'],
  ['higgsfield', 'higgsfield'],
  ['motion', 'motion'],
  ['voice', 'voice_message'],
]

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function toolLabel(tool: string | null | undefined) {
  return (tool && TOOL_LABELS[tool]) || null
}

function describe(entry: JetonsLedgerEntry) {
  const meta = entry.meta || {}
  const reason = text(meta.reason)
  const source = text(meta.source)

  if (entry.kind === 'usage') {
    const seconds = Number(meta.durationSeconds)
    return {
      type: 'usage' as const,
      title: toolLabel(entry.tool) || 'Utilisation',
      detail: Number.isFinite(seconds) && seconds > 0 ? `${Math.round(seconds * 10) / 10} s` : null,
    }
  }

  if (/refund|failed/.test(reason)) {
    const metaTool = text(meta.tool)
    const fromReason = REASON_TOOLS.find(([needle]) => reason.includes(needle))?.[1]
    const label = toolLabel(metaTool) || toolLabel(fromReason)
    return { type: 'refund' as const, title: 'Remboursement', detail: label ? `${label} · génération échouée` : 'Génération échouée' }
  }

  if (source === 'subscription') {
    const plan = text(meta.plan)
    return { type: 'credit' as const, title: 'Jetons du forfait', detail: plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : null }
  }
  if (source === 'revenuecat_purchase') return { type: 'credit' as const, title: 'Achat de Jetons', detail: 'App Store' }
  if (source === 'admin_manual') return { type: 'credit' as const, title: 'Crédit ChapCam', detail: null }
  return { type: 'credit' as const, title: 'Jetons ajoutés', detail: null }
}

export async function GET(request: NextRequest) {
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: NO_STORE })
  }

  try {
    const ledger = await getJetonsLedger(user.id, 50)
    const items = ledger
      .filter((entry) => entry.amount !== 0)
      .map((entry) => ({
        id: entry.id,
        amount: entry.amount,
        balanceAfter: entry.balanceAfter,
        createdAt: entry.createdAt,
        ...describe(entry),
      }))
    return NextResponse.json({ items }, { headers: NO_STORE })
  } catch (error) {
    console.error('[mobile/activity]', error)
    return NextResponse.json({ error: 'Activité indisponible' }, { status: 500, headers: NO_STORE })
  }
}
