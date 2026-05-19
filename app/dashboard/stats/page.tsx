"use client"

import { motion } from "framer-motion"
import { Clock, Zap, TrendingUp, Calendar } from "lucide-react"
import { Card } from "@/components/ui/card"

export default function StatsPage() {
  const stats = [
    { 
      label: "Heures de Stream", 
      value: "12.5h", 
      icon: Clock, 
      color: "text-[#00ff88]",
      bgColor: "bg-[#00ff88]/20"
    },
    { 
      label: "Sessions ce Mois", 
      value: "8", 
      icon: Calendar, 
      color: "text-purple-500",
      bgColor: "bg-purple-500/20"
    },
    { 
      label: "Avatars Utilises", 
      value: "3", 
      icon: Zap, 
      color: "text-blue-500",
      bgColor: "bg-blue-500/20"
    },
    { 
      label: "Temps Moyen/Session", 
      value: "1.5h", 
      icon: TrendingUp, 
      color: "text-orange-500",
      bgColor: "bg-orange-500/20"
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Statistiques</h1>
        <p className="text-gray-400">Suis ton utilisation de ChapCam</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-[#111111] border-white/10 p-6">
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Usage Chart Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-[#111111] border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Activite cette Semaine</h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day, i) => {
              const height = [30, 60, 45, 80, 20, 90, 50][i]
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-[#00ff88]/20 rounded-t-lg transition-all duration-500 hover:bg-[#00ff88]/40"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-500">{day}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </motion.div>

      {/* Recent Sessions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-[#111111] border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sessions Recentes</h3>
          <div className="space-y-3">
            {[
              { date: "Aujourd'hui", duration: "2h 15min", avatar: "Avatar 1" },
              { date: "Hier", duration: "1h 30min", avatar: "Avatar 2" },
              { date: "12 Mai", duration: "3h 00min", avatar: "Avatar 1" },
            ].map((session, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white font-medium">{session.date}</p>
                  <p className="text-sm text-gray-400">{session.avatar}</p>
                </div>
                <span className="text-[#00ff88] font-mono">{session.duration}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
