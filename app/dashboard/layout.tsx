import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav"

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

  // For now, use simple plan logic
  // Later you can add subscription table queries
  const currentPlan = "free"
  const isActive = false
  const usedAvatars = 0
  const planLimit = 0

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
      
      {/* Main Content */}
      <main className="md:ml-[240px] min-h-screen pt-14 md:pt-0">
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
