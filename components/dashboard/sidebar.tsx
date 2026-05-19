"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Zap, Users, BarChart2, Settings, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  userEmail: string
  currentPlan: string
  isActive: boolean
  usedAvatars: number
  planLimit: number
}

const navLinks = [
  { href: "/dashboard", icon: Zap, label: "LIVE SWAP" },
  { href: "/dashboard/avatars", icon: Users, label: "MES AVATARS" },
  { href: "/dashboard/stats", icon: BarChart2, label: "STATISTIQUES" },
  { href: "/dashboard/settings", icon: Settings, label: "PARAMETRES" },
]

const planColors: Record<string, string> = {
  free: "bg-gray-500",
  "1day": "bg-blue-500",
  "30days": "bg-green-500",
  "90days": "bg-purple-500",
  "365days": "bg-yellow-500",
}

const planLabels: Record<string, string> = {
  free: "Plan Gratuit",
  "1day": "Plan 1 Jour",
  "30days": "Plan 30 Jours",
  "90days": "Plan 90 Jours",
  "365days": "Plan 365 Jours",
}

export function DashboardSidebar({ 
  userEmail, 
  currentPlan, 
  isActive,
  usedAvatars,
  planLimit 
}: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const avatarPercentage = planLimit === Infinity 
    ? (usedAvatars > 0 ? 50 : 0)
    : planLimit > 0 
      ? (usedAvatars / planLimit) * 100 
      : 0

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-[#0a0a0a] border-r border-white/10 flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-1">
          <span className="text-2xl font-bold text-white">Chap</span>
          <span className="text-2xl font-bold text-[#00ff88]">Cam</span>
        </Link>
        <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Swap en temps reel</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6">
        {navLinks.map((link) => {
          const isLiveSwap = link.href === "/dashboard"
          const isExactMatch = pathname === link.href
          const isActive = isLiveSwap ? isExactMatch : pathname.startsWith(link.href)
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`
                flex items-center gap-3 px-6 py-3 text-sm font-bold uppercase tracking-wide
                transition-all duration-200
                ${isActive 
                  ? "text-[#00ff88] border-l-2 border-[#00ff88] bg-white/5" 
                  : "text-gray-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
                }
              `}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-white/10 space-y-4">
        {/* Email */}
        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
        
        {/* Plan Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${planColors[currentPlan] || planColors.free}`}>
            {planLabels[currentPlan] || "Plan Gratuit"}
          </span>
        </div>

        {/* Avatar Usage */}
        <div className="space-y-2">
          <p className="text-xs text-gray-400">
            {usedAvatars}/{planLimit === Infinity ? "∞" : planLimit} avatars utilises
          </p>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#00ff88] rounded-full transition-all duration-300"
              style={{ width: `${Math.min(avatarPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Upgrade Banner (if free or inactive) */}
        {(!isActive || currentPlan === "free") && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3">
            <p className="text-xs text-orange-400 mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Upgrade pour acceder au swap
            </p>
            <Link href="/#tarifs">
              <Button 
                size="sm" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
              >
                UPGRADER
              </Button>
            </Link>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm w-full py-2"
        >
          <LogOut className="w-4 h-4" />
          Deconnexion
        </button>
      </div>

      {/* Custom Scrollbar Style */}
      <style jsx global>{`
        .dashboard-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .dashboard-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .dashboard-scrollbar::-webkit-scrollbar-thumb {
          background: #00ff88;
          border-radius: 2px;
        }
      `}</style>
    </aside>
  )
}
