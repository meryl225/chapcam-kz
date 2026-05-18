import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import PricingClient from "./pricing-client"

export default async function DashboardPricingPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  return <PricingClient />
}
