"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Zap, Users, BarChart2, Settings, LogOut, Menu, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface MobileNavProps {
  userEmail: string
  currentPlan: string
  isActive: boolean
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

export function DashboardMobileNav({ userEmail, currentPlan, isActive }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0a0a0a] border-b border-white/10 flex items-center justify-between px-4 z-50">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-1">
        <span className="text-xl font-bold text-white">Chap</span>
        <span className="text-xl font-bold text-[#00ff88]">Cam</span>
      </Link>

      {/* Hamburger Menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] bg-[#0a0a0a] border-l border-white/10 p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xl font-bold text-white">Chap</span>
                <span className="text-xl font-bold text-[#00ff88]">Cam</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6">
              {navLinks.map((link) => {
                const isLiveSwap = link.href === "/dashboard"
                const isExactMatch = pathname === link.href
                const isLinkActive = isLiveSwap ? isExactMatch : pathname.startsWith(link.href)
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`
                      flex items-center gap-3 px-6 py-4 text-sm font-bold uppercase tracking-wide
                      transition-all duration-200
                      ${isLinkActive 
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
            <div className="p-6 border-t border-white/10 space-y-4">
              <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              
              <span className={`inline-block px-2 py-1 rounded text-xs font-bold text-white ${planColors[currentPlan] || planColors.free}`}>
                {planLabels[currentPlan] || "Plan Gratuit"}
              </span>

              {(!isActive || currentPlan === "free") && (
                <Link href="/#tarifs" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold">
                    <Zap className="w-4 h-4 mr-2" />
                    UPGRADER
                  </Button>
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm w-full py-2"
              >
                <LogOut className="w-4 h-4" />
                Deconnexion
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}
