import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Une transaction PayDunya reelle, apres deduplication.
interface ReceivedPayment {
  id: string
  email: string | null
  productId: string | null
  amount: number
  token: string | null
  transactionId: string | null
  fullName: string | null
  userLinked: boolean
  credited: boolean
  creditKind: string | null
  createdAt: string
  // Nombre de lignes brutes (status + callback + ...) fusionnees sur cette transaction.
  logCount: number
}

/**
 * Paiements PayDunya RECUS et REELS (dedupliques).
 *
 * Pourquoi : la table `payment_logs` journalise CHAQUE transaction plusieurs fois
 * (une ligne `status`, une ligne `callback`, parfois plus). Sommer brutalement les
 * montants gonfle donc le total (~2x). On deduplique ici par `token` (cle stable
 * PayDunya), avec repli sur `transaction_id` puis `email|amount|jour`, en gardant
 * la ligne la PLUS ANCIENNE (le vrai instant du paiement). Le resultat est le
 * chiffre d'affaires reellement encaisse via PayDunya.
 */
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()

    // 1) Recuperer TOUTES les lignes completed (hors reconciliations manuelles),
    //    en paginant : la table depasse la limite par defaut de 1000 lignes.
    const PAGE = 1000
    let from = 0
    const rows: any[] = []
    // Garde-fou : au plus 20 pages (20 000 lignes).
    for (let i = 0; i < 20; i++) {
      const { data, error } = await admin
        .from('payment_logs')
        .select(
          'id, source, token, transaction_id, email, product_id, amount, credited, credit_kind, user_linked, raw, created_at',
        )
        .eq('status', 'completed')
        .neq('source', 'reconcile')
        .order('created_at', { ascending: true })
        .range(from, from + PAGE - 1)
      if (error) {
        console.error('[admin/payments/received] Erreur lecture:', error.message)
        return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
      }
      if (!data || data.length === 0) break
      rows.push(...data)
      if (data.length < PAGE) break
      from += PAGE
    }

    // 2) Deduplication. Les lignes sont triees par date ASC : la premiere vue
    //    pour une cle est donc la plus ancienne (le paiement d'origine).
    const byKey = new Map<string, ReceivedPayment>()
    for (const r of rows) {
      const key =
        r.token ||
        r.transaction_id ||
        `${r.email || '?'}|${r.amount || 0}|${(r.created_at || '').slice(0, 10)}`
      const existing = byKey.get(key)
      if (existing) {
        // Transaction deja connue : on fusionne (compte + on garde la meilleure info).
        existing.logCount += 1
        if (r.credited) existing.credited = true
        if (!existing.creditKind && r.credit_kind) existing.creditKind = r.credit_kind
        if (!existing.userLinked && r.user_linked) existing.userLinked = true
        if (!existing.fullName && r.raw?.full_name) existing.fullName = r.raw.full_name
        continue
      }
      byKey.set(key, {
        id: r.id,
        email: r.email,
        productId: r.product_id,
        amount: Number(r.amount) || 0,
        token: r.token,
        transactionId: r.transaction_id,
        fullName: r.raw?.full_name ?? null,
        userLinked: !!r.user_linked,
        credited: !!r.credited,
        creditKind: r.credit_kind ?? null,
        createdAt: r.created_at,
        logCount: 1,
      })
    }

    // 3) Tri final : les paiements les plus recents en premier (lecture admin).
    const payments = [...byKey.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const creditedCount = payments.filter((p) => p.credited).length

    // 4) Repartition PAR JOUR (suivi du nombre de paiements entrants/jour).
    //    On groupe par date (Africa/Abidjan = UTC+0, donc le prefixe ISO YYYY-MM-DD
    //    correspond a la date locale). Pour chaque jour : nombre de transactions
    //    reelles, montant encaisse, et nombre effectivement credite.
    const dailyMap = new Map<
      string,
      { date: string; count: number; amount: number; creditedCount: number }
    >()
    for (const p of payments) {
      const date = (p.createdAt || '').slice(0, 10)
      if (!date) continue
      const d = dailyMap.get(date) || { date, count: 0, amount: 0, creditedCount: 0 }
      d.count += 1
      d.amount += p.amount
      if (p.credited) d.creditedCount += 1
      dailyMap.set(date, d)
    }
    // Du plus recent au plus ancien.
    const daily = [...dailyMap.values()].sort((a, b) => (a.date < b.date ? 1 : -1))

    // Total du jour courant (meme convention de date que ci-dessus).
    const todayKey = new Date().toISOString().slice(0, 10)
    const today = dailyMap.get(todayKey) || {
      date: todayKey,
      count: 0,
      amount: 0,
      creditedCount: 0,
    }

    return NextResponse.json({
      payments,
      daily,
      today,
      stats: {
        totalCount: payments.length,
        totalAmount,
        creditedCount,
        rawCount: rows.length,
        activeDays: daily.length,
      },
    })
  } catch (e: any) {
    console.error('[admin/payments/received] Exception:', e?.message)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
