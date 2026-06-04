"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Trash2, 
  Upload, 
  Check, 
  X, 
  ImageIcon,
  Sparkles,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

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
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  
  // Upload modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [avatarName, setAvatarName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  
  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Fetch avatars from Supabase
  const fetchAvatars = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('user_avatars')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching avatars:', error)
      toast({ title: 'Erreur', description: 'Impossible de charger les avatars', variant: 'destructive' })
      return
    }

    if (data) {
      setAvatars(data)
    }
  }, [supabase, toast])

  // Check auth and load avatars
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/auth/login')
        return
      }
      
      setUserId(user.id)
      await fetchAvatars(user.id)
      setLoading(false)
    }
    init()
  }, [router, supabase, fetchAvatars])

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
    const file = e.dataTransfer.files[0]
    if (file) {
      const input = fileInputRef.current
      if (input) {
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>)
      }
    }
  }, [handleFileSelect])

  // Save avatar using Supabase Storage
  const handleSaveAvatar = async () => {
    if (!selectedFile || !avatarName.trim() || !userId) {
      toast({ title: 'Erreur', description: 'Nom et photo requis', variant: 'destructive' })
      return
    }

    setUploading(true)

    try {
      // Generate unique filename
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        toast({ title: 'Erreur', description: 'Impossible d\'uploader l\'image. Verifiez que le bucket "avatars" existe dans Supabase Storage.', variant: 'destructive' })
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Insert into database
      const { data, error } = await supabase
        .from('user_avatars')
        .insert({
          user_id: userId,
          name: avatarName.trim(),
          url: publicUrl,
          is_active: avatars.length === 0
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving avatar:', error)
        // Delete uploaded file if DB insert fails
        await supabase.storage.from('avatars').remove([fileName])
        toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' })
        return
      }

      // Update local state
      setAvatars(prev => [data, ...prev])
      
      // Reset modal
      setIsModalOpen(false)
      setSelectedFile(null)
      setPreviewUrl(null)
      setAvatarName("")

      toast({ title: 'Avatar cree!', description: `"${avatarName}" a ete ajoute` })

    } catch (err) {
      console.error('Error:', err)
      toast({ title: 'Erreur', description: 'Une erreur est survenue', variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  // Delete avatar
  const handleDeleteAvatar = async (id: string) => {
    const { error } = await supabase
      .from('user_avatars')
      .delete()
      .eq('id', id)

    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' })
      return
    }

    setAvatars(prev => prev.filter(a => a.id !== id))
    setDeletingId(null)
    toast({ title: 'Avatar supprime' })
  }

  // Set active avatar
  const handleSetActive = async (avatar: Avatar) => {
    if (!userId) return

    // Reset all to inactive
    await supabase
      .from('user_avatars')
      .update({ is_active: false })
      .eq('user_id', userId)

    // Set selected as active
    await supabase
      .from('user_avatars')
      .update({ is_active: true })
      .eq('id', avatar.id)

    // Update local state
    setAvatars(prev => prev.map(a => ({
      ...a,
      is_active: a.id === avatar.id
    })))

    toast({ title: `"${avatar.name}" est maintenant actif` })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">MES AVATARS</h1>
          <p className="text-muted-foreground mt-1">Uploade la photo de la personne en qui tu veux te transformer en temps reel</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-black hover:bg-primary/90 font-semibold"
        >
          <Plus className="mr-2 h-4 w-4" /> AJOUTER UNE PHOTO
        </Button>
      </div>

      {/* Avatars Grid */}
      {avatars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-hairline-strong rounded-2xl bg-card">
          <Sparkles className="h-16 w-16 text-primary/30 mb-4" />
          <p className="text-muted-foreground mb-4">Aucun avatar pour le moment</p>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-black hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" /> Creer mon premier avatar
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {avatars.map((avatar) => (
            <div
              key={avatar.id}
              className={`relative group rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                avatar.is_active
                  ? 'border-primary shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                  : 'border-hairline hover:border-white/30'
              }`}
              onClick={() => handleSetActive(avatar)}
            >
              <div className="aspect-[3/4]">
                <img
                  src={avatar.url}
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Active badge */}
              {avatar.is_active && (
                <div className="absolute top-3 right-3 bg-primary text-black text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Check className="h-3 w-3" /> ACTIF
                </div>
              )}

              {/* Name overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                <p className="text-foreground font-semibold truncate">{avatar.name}</p>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setDeletingId(avatar.id)
                }}
                className="absolute top-3 left-3 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-hairline text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un avatar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name input */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Nom de l'avatar</label>
              <Input
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                placeholder="Ex: John, Emma, etc."
                className="bg-secondary border-hairline text-foreground"
                maxLength={30}
              />
            </div>

            {/* Upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                previewUrl ? 'border-primary' : 'border-hairline-strong hover:border-white/40'
              }`}
            >
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                      setPreviewUrl(null)
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 text-text-faint mx-auto mb-3" />
                  <p className="text-muted-foreground">Glisse une photo ici ou clique pour selectionner</p>
                  <p className="text-text-faint text-sm mt-2">JPG, PNG ou WebP - Max 15 Mo</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Tips */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-primary text-sm font-medium mb-1">Conseils pour un bon resultat:</p>
              <ul className="text-muted-foreground text-xs space-y-1">
                <li>- Photo de face, bien eclairee</li>
                <li>- Visage bien visible et centre</li>
                <li>- Fond neutre de preference</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false)
                  setSelectedFile(null)
                  setPreviewUrl(null)
                  setAvatarName("")
                }}
                className="flex-1 border-hairline-strong text-foreground hover:bg-muted"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveAvatar}
                disabled={!selectedFile || !avatarName.trim() || uploading}
                className="flex-1 bg-primary text-black hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
                ) : (
                  "Enregistrer l'avatar"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="bg-card border-hairline text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cet avatar ?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Cette action est irreversible.</p>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingId(null)}
              className="flex-1 border-hairline-strong text-foreground hover:bg-muted"
            >
              Annuler
            </Button>
            <Button
              onClick={() => deletingId && handleDeleteAvatar(deletingId)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
