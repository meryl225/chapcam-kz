"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { 
  UserPlus, 
  Plus, 
  Trash2, 
  Upload, 
  Check, 
  X, 
  AlertCircle,
  ImageIcon,
  Sparkles,
  Crown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"

// Plan limits for avatars
const PLAN_LIMITS: Record<string, number> = {
  free: 0,
  "1day": 1,
  "30days": 3,
  "90days": 10,
  "365days": Infinity,
}

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit",
  "1day": "1 jour",
  "30days": "30 jours",
  "90days": "90 jours",
  "365days": "365 jours",
}

interface Avatar {
  id: string
  user_id: string
  name: string
  url: string
  is_active: boolean
  created_at: string
}

interface Subscription {
  plan: string
  expires_at: string | null
  is_active: boolean
}

export default function AvatarsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [plan, setPlan] = useState<string>("free")
  const [userId, setUserId] = useState<string | null>(null)
  
  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [avatarName, setAvatarName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Computed values
  const limit = PLAN_LIMITS[plan] ?? 0
  const canUpload = plan !== "free" && avatars.length < limit
  const slotsUsed = avatars.length
  const slotsTotal = limit === Infinity ? "illimite" : limit

  // Slot badge color
  const getSlotBadgeColor = () => {
    if (plan === "free") return "bg-gray-600 text-gray-300"
    if (limit === Infinity) return "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30"
    const remaining = limit - slotsUsed
    if (remaining === 0) return "bg-red-500/20 text-red-400 border border-red-500/30"
    if (remaining === 1) return "bg-orange-500/20 text-orange-400 border border-orange-500/30"
    return "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30"
  }

  // Fetch user data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push("/auth/login")
          return
        }
        setUserId(user.id)

        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("plan, expires_at, is_active")
          .eq("user_id", user.id)
          .single()

        let effectivePlan = "free"
        if (subscription) {
          const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date()
          if (subscription.is_active && !isExpired) {
            effectivePlan = subscription.plan
          }
        }
        setPlan(effectivePlan)

        const { data: avatarsData, error: avatarsError } = await supabase
          .from("user_avatars")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })

        if (avatarsError) throw avatarsError
        setAvatars(avatarsData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Erreur",
          description: "Impossible de charger vos donnees",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router, supabase, toast])

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

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        const maxSize = 1024
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error("Failed to compress image"))
          },
          "image/jpeg",
          0.92
        )
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile || !avatarName.trim() || !userId) return

    if (avatars.length >= limit) {
      toast({
        title: "Limite atteinte",
        description: "Tu as atteint le nombre maximum d'avatars pour ton plan",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      setUploadProgress(30)
      const compressedBlob = await compressImage(selectedFile)

      const fileName = `${userId}/${crypto.randomUUID()}.jpg`

      setUploadProgress(50)
      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(fileName, compressedBlob, {
          contentType: "image/jpeg",
          upsert: false,
        })

      if (storageError) throw storageError

      setUploadProgress(70)
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName)

      setUploadProgress(90)
      const { data: newAvatar, error: dbError } = await supabase
        .from("user_avatars")
        .insert({
          user_id: userId,
          name: avatarName.trim(),
          url: publicUrl,
          is_active: avatars.length === 0,
        })
        .select()
        .single()

      if (dbError) throw dbError

      setUploadProgress(100)
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
        description: "Impossible d'uploader l'avatar",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (avatar: Avatar) => {
    try {
      const urlParts = avatar.url.split("/avatars/")
      const filePath = urlParts[1]

      if (filePath) {
        await supabase.storage.from("avatars").remove([filePath])
      }

      const { error } = await supabase
        .from("user_avatars")
        .delete()
        .eq("id", avatar.id)

      if (error) throw error

      setAvatars((prev) => prev.filter((a) => a.id !== avatar.id))
      setDeletingId(null)

      toast({
        title: "Avatar supprime",
        description: `"${avatar.name}" a ete supprime`,
      })
    } catch (error) {
      console.error("Delete error:", error)
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'avatar",
        variant: "destructive",
      })
    }
  }

  const handleSetActive = async (avatar: Avatar) => {
    try {
      await supabase
        .from("user_avatars")
        .update({ is_active: false })
        .eq("user_id", userId!)

      const { error } = await supabase
        .from("user_avatars")
        .update({ is_active: true })
        .eq("id", avatar.id)

      if (error) throw error

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
    } catch (error) {
      console.error("Set active error:", error)
      toast({
        title: "Erreur",
        description: "Impossible d'activer l'avatar",
        variant: "destructive",
      })
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setAvatarName("")
    setSelectedFile(null)
    setPreviewUrl(null)
    setUploadProgress(0)
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
          <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${getSlotBadgeColor()}`}>
            <ImageIcon className="h-4 w-4" />
            <span>
              Plan {PLAN_LABELS[plan]} — {slotsUsed}/{slotsTotal} photos
            </span>
          </div>

          {plan === "free" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled
                  className="cursor-not-allowed bg-gray-700 text-gray-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  AJOUTER UNE PHOTO
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-800 text-white">
                <p>Upgrade pour ajouter des avatars</p>
              </TooltipContent>
            </Tooltip>
          ) : !canUpload ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  disabled
                  className="cursor-not-allowed bg-gray-700 text-gray-400"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  AJOUTER UNE PHOTO
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-800 text-white">
                <p>Limite atteinte — Upgrade ton plan</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#00ff88] font-bold uppercase text-black transition-all hover:bg-[#00ff88]/90 hover:shadow-[0_0_20px_rgba(0,255,136,0.4)]"
            >
              <Plus className="mr-2 h-4 w-4" />
              AJOUTER UNE PHOTO
            </Button>
          )}
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
            {plan === "free"
              ? "Upgrade ton abonnement pour commencer a te transformer"
              : "Uploade ta premiere photo pour commencer a te transformer"}
          </p>
          {plan === "free" ? (
            <Button
              onClick={() => router.push("/dashboard/plans")}
              className="bg-gradient-to-r from-[#7c3aed] to-[#00d4ff] font-bold uppercase text-white"
            >
              <Crown className="mr-2 h-4 w-4" />
              VOIR LES PLANS
            </Button>
          ) : (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#00ff88] font-bold uppercase text-black hover:bg-[#00ff88]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              AJOUTER MA PREMIERE PHOTO
            </Button>
          )}
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

            <div className="rounded-xl bg-[#111111] p-4">
              <p className="mb-3 text-sm font-medium text-gray-300">
                Conseils pour de meilleurs resultats :
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 text-green-400">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  Photo nette et bien eclairee
                </li>
                <li className="flex items-start gap-2 text-green-400">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  Visage et corps entiers visibles
                </li>
                <li className="flex items-start gap-2 text-green-400">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  Une seule personne dans l&apos;image
                </li>
                <li className="flex items-start gap-2 text-green-400">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  Fond neutre recommande
                </li>
                <li className="flex items-start gap-2 text-red-400">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  Evite les lunettes de soleil
                </li>
                <li className="flex items-start gap-2 text-red-400">
                  <X className="mt-0.5 h-4 w-4 shrink-0" />
                  Evite les groupes de personnes
                </li>
              </ul>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress 
                  value={uploadProgress} 
                  className="h-2 bg-gray-800 [&>div]:bg-[#00ff88]" 
                />
                <p className="text-center text-sm text-gray-400">
                  Upload en cours... {uploadProgress}%
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={closeModal}
                disabled={uploading}
                className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/10"
              >
                Annuler
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || !avatarName.trim() || uploading}
                className="flex-1 bg-[#00ff88] font-bold uppercase text-black hover:bg-[#00ff88]/90 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
              >
                {uploading ? "Upload..." : "ENREGISTRER L'AVATAR"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="border-white/10 bg-[#0a0a0a] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Supprimer cet avatar ?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Cette action est irreversible. L&apos;avatar sera definitivement supprime.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              className="flex-1 border-white/10 bg-transparent text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                const avatar = avatars.find((a) => a.id === deletingId)
                if (avatar) handleDelete(avatar)
              }}
              className="flex-1 bg-red-500 font-bold uppercase text-white hover:bg-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              SUPPRIMER
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
