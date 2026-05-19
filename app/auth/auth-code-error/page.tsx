import Link from 'next/link'

export default function AuthCodeErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#111111] p-8 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-xl font-bold text-white">Erreur d&apos;authentification</h1>
        <p className="mb-6 text-sm text-gray-400">
          Une erreur est survenue lors de la verification de ton compte. Le lien a peut-etre expire.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="w-full rounded-lg bg-[#00ff88] py-3 font-bold uppercase text-black transition-colors hover:bg-[#00cc6a]"
          >
            Retour a la connexion
          </Link>
          <Link
            href="/auth/sign-up"
            className="text-sm text-[#00ff88] hover:underline"
          >
            Creer un nouveau compte
          </Link>
        </div>
      </div>
    </div>
  )
}
