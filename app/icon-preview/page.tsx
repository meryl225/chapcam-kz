const iconUrl = "/chapcam-icon-preview-1024.png"

const apps = [
  { name: "ChapCam", image: true },
  { name: "Photos" },
  { name: "Safari" },
  { name: "Mail" },
]

export default function IconPreviewPage() {
  return (
    <main className="min-h-screen bg-[#090f22] px-6 py-12 text-white sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10">
        <header className="text-center">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.28em] text-[#69a6ff]">ChapCam · aperçu iOS</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Icône sur l’écran d’accueil</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-300">Simulation visuelle à taille réaliste. Le PNG iOS actuel n’est pas remplacé et aucun build n’est lancé.</p>
        </header>

        <section className="relative w-full max-w-[430px] overflow-hidden rounded-[3.2rem] border border-white/10 bg-[#111a35] px-7 pb-16 pt-14 shadow-2xl shadow-blue-950/50" aria-label="Simulation d’écran d’accueil iPhone">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-8 pt-5 text-xs font-semibold text-white/90"><span>21:48</span><span className="tracking-widest">▮▮▮　Wi-Fi　▰</span></div>
          <div className="mb-12 grid grid-cols-4 gap-x-5 gap-y-8">
            {apps.map((app) => (
              <div key={app.name} className="flex min-w-0 flex-col items-center gap-2">
                <div className="aspect-square w-full overflow-hidden rounded-[24%] bg-slate-700 shadow-lg shadow-black/20">
                  {app.image ? <img src={iconUrl} alt="Icône ChapCam avec contour bleu électrique et symbole infini multicolore" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-gradient-to-br from-slate-500 to-slate-800" aria-hidden="true" />}
                </div>
                <span className="truncate text-xs text-white/90">{app.name}</span>
              </div>
            ))}
          </div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xs text-white/70">⌂</div>
        </section>

        <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
          {["∞ multicolore conservé", "Contour électrique proche des bords", "Aucune petite icône dans l’icône"].map((label) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-center text-sm text-slate-200">{label}</div>)}
        </div>
      </div>
    </main>
  )
}
