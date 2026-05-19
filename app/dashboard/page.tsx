import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LiveSwapClient } from "./live-swap-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get active subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single()

  const currentPlan = subscription?.plan || "free"
  const isExpired = subscription?.expires_at 
    ? new Date(subscription.expires_at) < new Date() 
    : true
  const isActive = subscription?.is_active && !isExpired

  return <LiveSwapClient isActive={isActive} currentPlan={currentPlan} />
}
