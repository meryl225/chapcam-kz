"use client"

import Link from "next/link"
import { Zap } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PlanGuardBanner() {
  return (
    <div className="fixed top-14 md:top-0 left-0 right-0 md:left-[240px] z-40 bg-gradient-to-r from-orange-600 to-orange-500 py-3 px-4">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-white text-sm font-medium flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>Tu es sur le plan gratuit — Active un abonnement pour demarrer le swap</span>
        </p>
        <Link href="https://chapcam.com/#tarifs" target="_blank">
          <Button 
            size="sm" 
            className="bg-white text-orange-600 hover:bg-gray-100 font-bold text-xs whitespace-nowrap"
          >
            VOIR LES OFFRES
          </Button>
        </Link>
      </div>
    </div>
  )
}
