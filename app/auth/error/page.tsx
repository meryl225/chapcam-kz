import Link from "next/link"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">
            Erreur d&apos;authentification
          </h1>
          
          <p className="text-gray-400 mb-6">
            Une erreur s&apos;est produite lors de l&apos;authentification. Veuillez reessayer.
          </p>

          <div className="flex gap-3">
            <Link href="/auth/login" className="flex-1">
              <Button className="w-full bg-[#1e293b] hover:bg-[#2d3a4f] text-white py-6 rounded-xl">
                Connexion
              </Button>
            </Link>
            <Link href="/auth/sign-up" className="flex-1">
              <Button className="w-full bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] text-white py-6 rounded-xl">
                Inscription
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
