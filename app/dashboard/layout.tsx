import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav"
import { PlanGuardBanner } from "@/components/dashboard/plan-guard-banner"

/*
subscriptions table schema:
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users UNIQUE,
  plan text CHECK (plan IN ('free','1day','30days','90days','365days')) DEFAULT 'free',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

user_avatars table schema:
CREATE TABLE user_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  url text NOT NULL,
  is_custom boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
*/

export const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  '1day': 1,
  '30days': 3,
  '90days': 10,
  '365days': Infinity
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan, expires_at, is_active")
    .eq("user_id", user.id)
    .single()

  // Get avatar count
  const { count: avatarCount } = await supabase
    .from("user_avatars")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)

  const currentPlan = subscription?.plan || "free"
  const isExpired = subscription?.expires_at 
    ? new Date(subscription.expires_at) < new Date() 
    : true
  const isActive = subscription?.is_active && !isExpired
  const showUpgradeBanner = currentPlan === "free" || !isActive

  const planLimit = PLAN_LIMITS[currentPlan] || 0
  const usedAvatars = avatarCount || 0

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Desktop Sidebar */}
      <DashboardSidebar 
        userEmail={user.email || ""} 
        currentPlan={currentPlan}
        isActive={isActive}
        usedAvatars={usedAvatars}
        planLimit={planLimit}
      />
      
      {/* Mobile Navigation */}
      <DashboardMobileNav 
        userEmail={user.email || ""} 
        currentPlan={currentPlan}
        isActive={isActive}
      />
      
      {/* Plan Guard Banner */}
      {showUpgradeBanner && <PlanGuardBanner />}
      
      {/* Main Content */}
      <main className={`
        md:ml-[240px] 
        min-h-screen 
        ${showUpgradeBanner ? 'pt-[120px] md:pt-[60px]' : 'pt-14 md:pt-0'}
      `}>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
