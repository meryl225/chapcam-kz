import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#111111] p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">
            <span className="text-white">Chap</span>
            <span className="text-[#00ff88]">Cam</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Connecte-toi pour accéder au dashboard
          </p>
        </div>

        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold uppercase text-gray-400">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="ton@email.com"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-[#00ff88] focus:outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold uppercase text-gray-400">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-[#00ff88] focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#00ff88] py-3 font-bold uppercase text-black transition-colors hover:bg-[#00cc6a]"
          >
            SE CONNECTER
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="text-[#00ff88] hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-400">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
