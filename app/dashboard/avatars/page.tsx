"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus, Upload, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

// Placeholder avatars for demo
const demoAvatars = [
  { id: 1, name: "Avatar 1", url: "/placeholder.svg", isCustom: false },
  { id: 2, name: "Avatar 2", url: "/placeholder.svg", isCustom: false },
]

export default function AvatarsPage() {
  const [avatars] = useState(demoAvatars)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mes Avatars</h1>
          <p className="text-gray-400">Gere tes visages personnalises pour le face swap</p>
        </div>
        <Button className="bg-[#00ff88] hover:bg-[#00dd77] text-black font-bold">
          <Plus className="w-4 h-4 mr-2" />
          AJOUTER
        </Button>
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-[#111111] border-white/10 border-dashed border-2 p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
              <Upload className="w-8 h-8 text-gray-500" />
            </div>
            <div>
              <p className="text-white font-medium">Glisse une image ici</p>
              <p className="text-sm text-gray-400">ou clique pour selectionner un fichier</p>
            </div>
            <p className="text-xs text-gray-500">PNG, JPG jusqu&apos;a 5MB. Visage bien visible recommande.</p>
          </div>
        </Card>
      </motion.div>

      {/* Avatars Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Mes Visages ({avatars.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {avatars.map((avatar, index) => (
            <motion.div
              key={avatar.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-[#111111] border-white/10 p-3 group hover:border-[#00ff88]/50 transition-colors">
                <div className="aspect-square rounded-lg bg-white/5 flex items-center justify-center mb-3 overflow-hidden">
                  <User className="w-12 h-12 text-gray-500" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white truncate">{avatar.name}</p>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}

          {/* Add New Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: avatars.length * 0.1 }}
          >
            <Card className="bg-[#111111] border-white/10 border-dashed p-3 hover:border-[#00ff88]/50 transition-colors cursor-pointer">
              <div className="aspect-square rounded-lg bg-white/5 flex items-center justify-center mb-3">
                <Plus className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-sm text-gray-400 text-center">Ajouter</p>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
