'use client'

import Link from 'next/link'
import useSWRMutation from 'swr/mutation'

type Finding = { title: string; status: string; evidence: string; action: string; scope: string }
type Report = { date: string; target: { version: string | null; build: string | null; state: string | null }; missingVariables: string[]; findings: Finding[] }

async function launch(url: string): Promise<Report> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Audit indisponible')
  return result
}

export default function AuditPanel() {
  const { data, error, trigger, isMutating } = useSWRMutation('/api/admin/ios-audit', launch)
  function download() {
    if (!data) return
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `chapcam-audit-ios-${data.date.slice(0, 10)}.json`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <main className="min-h-screen bg-background px-4 py-10 font-sans text-foreground md:px-8">
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <Link href="/admin/payments" className="text-sm text-muted-foreground underline">Retour à l’administration</Link>
      <header className="flex flex-col gap-3">
        <p className="text-sm text-primary">CHAPCAM / CONTRÔLE AVANT SOUMISSION</p>
        <h1 className="text-balance text-3xl font-semibold">Audit iOS</h1>
        <p className="text-muted-foreground leading-relaxed">Cible demandée : version 2.0, build 28. L’API vérifie le build réellement attaché. Lecture seule : aucune soumission, modification ni action sur l’appel en cours.</p>
        <p className="rounded-lg border border-border p-4 text-sm leading-relaxed">Cet audit ne garantit jamais l’acceptation Apple. « Vérifié » signifie uniquement que le contrôle décrit a été effectué. La revue du code est un instantané, pas un test sur iPhone ou iPad.</p>
      </header>
      <div className="flex flex-wrap gap-3">
        <button disabled={isMutating} onClick={() => trigger().catch(() => {})} className="rounded-lg bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-50">{isMutating ? 'Audit en cours…' : 'Lancer l’audit iOS'}</button>
        {data && <button onClick={download} disabled={isMutating} className="rounded-lg border border-border px-5 py-3">Exporter le rapport JSON</button>}
      </div>
      <div aria-live="polite">{error && <p role="alert">{error.message}</p>}{isMutating && <p>Lecture des ressources Apple et de toutes leurs pages. Aucun secret ne sera exporté.</p>}</div>
      {data && <section className="flex flex-col gap-6" aria-label="Résultats de l’audit">
        <div className="flex flex-col gap-2 border-b border-border pb-6">
          <h2 className="text-xl font-semibold">Résultats du {new Date(data.date).toLocaleString('fr-FR')}</h2>
          <p>Version Apple : {data.target.version ?? 'Non vérifiée'} · Build attaché : {data.target.build ?? 'Non vérifié'} · Statut : {data.target.state ?? 'Non vérifié'}</p>
          <p className="text-sm text-muted-foreground">Rapport conservé uniquement pour cette session. Export sans clé, JWT, coordonnées ou identifiants de démonstration.</p>
        </div>
        {data.missingVariables.length > 0 && <aside className="flex flex-col gap-3 rounded-lg border border-border p-5">
          <h3 className="font-semibold">Configuration serveur requise</h3>
          <p>Dans App Store Connect : Users and Access → Integrations → App Store Connect API, utiliser une clé équipe avec accès aux ressources nécessaires.</p>
          <p>Dans Vercel → Settings → Environment Variables, ajouter : <strong>{data.missingVariables.join(', ')}</strong>. ASC_PRIVATE_KEY contient le fichier .p8 complet. Redéployer ensuite le serveur web.</p>
          <p>Ne pas les coller dans le chat, ne pas utiliser NEXT_PUBLIC. Aucun nouveau build iOS nécessaire.</p>
        </aside>}
        <div className="flex flex-wrap gap-4 text-sm">{['Manquant', 'À vérifier', 'Vérifié', 'Non vérifié'].map((s) => <span key={s}>{s} : {data.findings.filter((f) => f.status === s).length}</span>)}</div>
        {data.findings.map((f, i) => <article key={i} className="flex flex-col gap-3 rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{f.title}</h3><span className="rounded-md bg-muted px-3 py-1 text-sm text-muted-foreground">{f.status}</span></div>
          <p className="text-sm text-muted-foreground">{f.scope}</p>
          <p className="break-words leading-relaxed">{f.evidence}</p>
          <p className="leading-relaxed"><strong>Action : </strong>{f.action}</p>
        </article>)}
      </section>}
    </div>
  </main>
}
