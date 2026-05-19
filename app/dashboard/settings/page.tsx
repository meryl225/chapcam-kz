"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { User, Bell, Shield, Palette, Globe, Save, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

export default function SettingsPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [settings, setSettings] = useState({
    notifications: true,
    emailUpdates: false,
    darkMode: true,
    language: "fr"
  })

  const settingsSections = [
    {
      title: "Profil",
      icon: User,
      color: "#8b5cf6",
      fields: [
        { label: "Nom complet", type: "text", placeholder: "Votre nom" },
        { label: "Email", type: "email", placeholder: "votre@email.com" },
      ]
    },
    {
      title: "Securite",
      icon: Shield,
      color: "#22c55e",
      fields: [
        { label: "Mot de passe actuel", type: "password", placeholder: "********" },
        { label: "Nouveau mot de passe", type: "password", placeholder: "********" },
      ]
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Parametres</h1>
        <p className="text-gray-400">Gerez votre compte et vos preferences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Profile & Security Settings */}
        {settingsSections.map((section, idx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-[#0d1525]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${section.color}20`, color: section.color }}
              >
                <section.icon className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
            </div>

            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.label} className="space-y-2">
                  <Label className="text-gray-400">{field.label}</Label>
                  <div className="relative">
                    <Input
                      type={field.type === "password" && showPassword ? "text" : field.type}
                      placeholder={field.placeholder}
                      className="bg-[#1a2235] border-white/10 text-white placeholder:text-gray-500 focus:border-[#00d4ff]"
                    />
                    {field.type === "password" && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#0d1525]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#f97316]/20 text-[#f97316]">
              <Bell className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a2235]">
              <div>
                <p className="text-white font-medium">Notifications push</p>
                <p className="text-gray-400 text-sm">Recevoir des alertes en temps reel</p>
              </div>
              <Switch 
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings({...settings, notifications: checked})}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a2235]">
              <div>
                <p className="text-white font-medium">Emails marketing</p>
                <p className="text-gray-400 text-sm">Offres et nouveautes ChapCam</p>
              </div>
              <Switch 
                checked={settings.emailUpdates}
                onCheckedChange={(checked) => setSettings({...settings, emailUpdates: checked})}
              />
            </div>
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-[#0d1525]/80 backdrop-blur-xl rounded-2xl border border-white/10 p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00d4ff]/20 text-[#00d4ff]">
              <Palette className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-semibold text-white">Apparence</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#1a2235]">
              <div>
                <p className="text-white font-medium">Mode sombre</p>
                <p className="text-gray-400 text-sm">Interface en theme sombre</p>
              </div>
              <Switch 
                checked={settings.darkMode}
                onCheckedChange={(checked) => setSettings({...settings, darkMode: checked})}
              />
            </div>
            <div className="p-3 rounded-xl bg-[#1a2235]">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <p className="text-white font-medium">Langue</p>
              </div>
              <select 
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full bg-[#0d1525] border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="fr">Francais</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Save Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-end"
      >
        <Button className="bg-gradient-to-r from-[#8b5cf6] to-[#00d4ff] text-white px-8 py-3 rounded-xl font-semibold hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all">
          <Save className="w-4 h-4 mr-2" />
          Sauvegarder les modifications
        </Button>
      </motion.div>
    </div>
  )
}
