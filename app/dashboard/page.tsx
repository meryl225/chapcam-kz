import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { LiveSwapClient } from "./live-swap-client"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Simple version - later add subscription queries
  const isActive = false
  const currentPlan = "free"

  return <LiveSwapClient isActive={isActive} currentPlan={currentPlan} />
}
