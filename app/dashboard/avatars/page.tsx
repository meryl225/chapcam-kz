"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  UserPlus, 
  Plus, 
  Trash2, 
  Upload, 
  Check, 
  X, 
  ImageIcon,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface Avatar {
  id: string
  name: string
  url: string
  is_active: boolean
  created_at: string
}

export default function AvatarsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [avatars, setAvatars] = useState<Avatar[]>([])
  
  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [avatarName, setAvatarName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Load avatars from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("chapcam_avatars")
      if (saved) {
        setAvatars(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Error loading avatars:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save avatars to localStorage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem("chapcam_avatars", JSON.stringify(avatars))
    }
  }, [avatars, loading])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Format invalide",
        description: "Seuls les formats JPG, PNG et WebP sont acceptes",
        variant: "destructive",
      })
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 15 Mo",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Format invalide",
        description: "Seuls les formats JPG, PNG et WebP sont acceptes",
        variant: "destructive",
      })
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 15 Mo",
        variant: "destructive",
      })
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }, [toast])

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile || !avatarName.trim()) return

    setUploading(true)

    try {
      // Convert to base64 for localStorage storage
      const base64 = await convertToBase64(selectedFile)

      const newAvatar: Avatar = {
        id: crypto.randomUUID(),
        name: avatarName.trim(),
        url: base64,
        is_active: avatars.length === 0,
        created_at: new Date().toISOString(),
      }

      setAvatars((prev) => [newAvatar, ...prev])

      toast({
        title: "Avatar ajoute",
        description: `"${avatarName}" a ete ajoute avec succes`,
      })

      setIsModalOpen(false)
      setAvatarName("")
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'avatar",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = (avatar: Avatar) => {
    setAvatars((prev) => prev.filter((a) => a.id !== avatar.id))
    setDeletingId(null)
    toast({
      title: "Avatar supprime",
      description: `"${avatar.name}" a ete supprime`,
    })
  }

  const handleSetActive = (avatar: Avatar) => {
    setAvatars((prev) =>
      prev.map((a) => ({
        ...a,
        is_active: a.id === avatar.id,
      }))
    )
    toast({
      title: "Avatar active",
      description: `"${avatar.name}" est maintenant ton avatar actif`,
    })
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setAvatarName("")
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#00ff88] border-t-transparent" />
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            MES AVATARS
          </h1>
          <p className="mt-2 text-sm text-gray-400 md:text-base">
            Uploade la photo de la personne en qui tu veux te transformer en temps reel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30">
            <ImageIcon className="h-4 w-4" />
            <span>{avatars.length} avatar(s)</span>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00ff88] font-bold uppercase text-black transition-all hover:bg-[#00ff88]/90 hover:shadow-[0_0_20px_rgba(0,255,136,0.4)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            AJOUTER UNE PHOTO
          </Button>
        </div>
      </div>

      {/* Content */}
      {avatars.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-700 bg-[#111111] p-8 md:p-12">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-800">
            <UserPlus className="h-10 w-10 text-gray-500" />
          </div>
          <h2 className="mb-2 text-center text-xl font-bold text-white">
            Aucun avatar pour l&apos;instant
          </h2>
          <p className="mb-6 max-w-md text-center text-gray-400">
            Uploade ta premiere photo pour commencer a te transformer
          </p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#00ff88] font-bold uppercase text-black hover:bg-[#00ff88]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            AJOUTER MA PREMIERE PHOTO
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className={`group relative overflow-hidden rounded-2xl bg-[#111111] transition-all ${
                avatar.is_active
                  ? "ring-2 ring-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)]"
                  : "ring-1 ring-white/10 hover:ring-white/20"
              }`}
            >
              <div className="aspect-[3/4] w-full overflow-hidden">
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {avatar.is_active && (
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#00ff88] px-3 py-1 text-xs font-bold uppercase text-black">
                  <Check className="h-3 w-3" />
                  ACTIF
                </div>
              )}

              <button
                onClick={() => setDeletingId(avatar.id)}
                className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-red-500 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
                <p className="mb-3 truncate text-lg font-bold text-white">
                  {avatar.name}
                </p>
                {!avatar.is_active && (
                  <Button
                    onClick={() => handleSetActive(avatar)}
                    className="w-full bg-[#00ff88] font-bold uppercase text-black opacity-0 transition-all hover:bg-[#00ff88]/90 group-hover:opacity-100"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    UTILISER
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-[#0a0a0a] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase">
              AJOUTER UN AVATAR
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Uploade la photo de la personne en qui tu veux te transformer
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Nom de l&apos;avatar
              </label>
              <Input
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value.slice(0, 30))}
                placeholder="Ex: Moi en costume, Sarah..."
                className="border-white/10 bg-[#111111] text-white placeholder:text-gray-500 focus:border-[#00ff88] focus:ring-[#00ff88]/20"
                maxLength={30}
              />
              <p className="text-right text-xs text-gray-500">
                {avatarName.length}/30
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Photo</label>
              {previewUrl ? (
                <div className="relative">
                  <div className="aspect-[3/4] w-full overflow-hidden rounded-xl">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setPreviewUrl(null)
                    }}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-700 bg-[#111111] p-8 transition-colors hover:border-[#00ff88]/50 hover:bg-[#111111]/80"
                >
                  <Upload className="mb-4 h-12 w-12 text-gray-500" />
                  <p className="mb-2 text-center font-medium text-white">
                    Glisse ta photo ici ou clique pour parcourir
                  </p>
                  <p className="text-center text-sm text-gray-500">
                    JPG, PNG ou WebP - Max 15 Mo
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={closeModal}
                className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5"
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !avatarName.trim() || uploading}
                className="flex-1 bg-[#00ff88] font-bold text-black hover:bg-[#00ff88]/90 disabled:opacity-50"
              >
                {uploading ? "Enregistrement..." : "Enregistrer l'avatar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="border-white/10 bg-[#0a0a0a] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Supprimer cet avatar ?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Cette action est irreversible.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/5"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                const avatar = avatars.find((a) => a.id === deletingId)
                if (avatar) handleDelete(avatar)
              }}
              className="flex-1 bg-red-500 font-bold text-white hover:bg-red-600"
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
