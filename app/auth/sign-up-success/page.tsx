import Link from "next/link"
import Image from "next/image"
import { CheckCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#22c55e]/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d4ff]/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl text-center">
          {/* Logo */}
          <Link href="/" className="flex justify-center mb-6">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20chapcam-Zg2rUUnOrSECjteElTxoU1rcYfwF3i.jpg"
              alt="ChapCam"
              width={80}
              height={80}
              className="rounded-xl"
            />
          </Link>

          <div className="w-20 h-20 bg-[#22c55e]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#22c55e]" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">
            Inscription reussie!
          </h1>
          
          <p className="text-gray-400 mb-6">
            Un email de confirmation a ete envoye a ton adresse. Verifie ta boite de reception pour activer ton compte.
          </p>

          <div className="bg-[#1e293b] rounded-xl p-4 mb-6 flex items-center gap-3">
            <Mail className="w-6 h-6 text-[#00d4ff]" />
            <p className="text-sm text-gray-300 text-left">
              Clique sur le lien dans l&apos;email pour confirmer ton compte et acceder a ton dashboard.
            </p>
          </div>

          <Link href="/auth/login">
            <Button className="w-full bg-gradient-to-r from-[#7c3aed] via-[#3b82f6] to-[#00d4ff] text-white py-6 rounded-xl font-semibold">
              Aller a la connexion
            </Button>
          </Link>

          <div className="mt-4">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">
              Retour a l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
