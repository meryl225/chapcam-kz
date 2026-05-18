import { createClient } from "@/lib/supabase/server"
import { getCheckoutSession } from "@/app/actions/stripe"
import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id } = await searchParams
  
  if (!session_id) {
    redirect("/dashboard/pricing")
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  try {
    const session = await getCheckoutSession(session_id)
    
    if (session.payment_status === "paid" && session.metadata) {
      const { planType, daysValid } = session.metadata
      
      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(daysValid))

      // Check if subscription already exists for this session
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("stripe_payment_id", session_id)
        .single()

      if (!existingSub) {
        // Create subscription
        await supabase.from("subscriptions").insert({
          user_id: user.id,
          plan_type: planType,
          status: "active",
          expires_at: expiresAt.toISOString(),
          stripe_payment_id: session_id,
          amount_paid: session.amount_total || 0,
        })
      }
    }
  } catch (error) {
    console.error("Error processing payment:", error)
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-[#22c55e]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-[#22c55e]" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">
            Paiement reussi!
          </h1>
          
          <p className="text-gray-400 mb-6">
            Ton abonnement ChapCam est maintenant actif. Tu peux commencer a utiliser le face swap IA immediatement.
          </p>

          <Link href="/dashboard">
            <Button className="w-full bg-gradient-to-r from-[#22c55e] to-[#10b981] text-white py-6 rounded-xl font-semibold">
              Aller au dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
