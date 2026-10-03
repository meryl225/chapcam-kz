import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Ionicons } from '@expo/vector-icons'
import { useVideoPlayer, VideoView } from 'expo-video'
import { supabase } from '../lib/supabase'
import { C, PAD } from '../ui/catalog'
import { ChapCamLoader } from '../ui/ChapCamLoader'
import { useJetonsBalance } from '../lib/useJetonsBalance'
import { API_URL, friendlyError } from '../lib/api'
import { AiBadge, ReportAbuseButton, RightsConsent } from '../ui/Safety'


// Same rules and options as app/dashboard/motion/page.tsx (Motion Control tab).
const MAX_PROMPT = 500
const MAX_PRESETS = 3
const MOTION_MAX_SECONDS = 10
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_REFERENCE_BYTES = 30 * 1024 * 1024
const QUALITIES = [
  { value: '720p', label: '720p', desc: 'HD' },
  { value: '1080p', label: '1080p', desc: 'Full HD' },
]
// Without a reference video the web sends "standard" for both cards (pro -> standard).
const ANIMATION_MODELS = [
  { value: 'standard', label: 'Standard', desc: 'Rendu rapide et fiable' },
  { value: 'pro', label: 'Pro', desc: 'Détails & fluidité maximum' },
]
const SCENES = [
  { value: 'keep', label: "Fond de l'image", icon: 'image-outline', prompt: '' },
  { value: 'neon', label: 'Studio néon', icon: 'color-wand-outline', prompt: 'change the background to a dark studio with vibrant neon lights, cinematic lighting' },
  { value: 'sunset', label: 'Plage · sunset', icon: 'sunny-outline', prompt: 'change the background to a beach at golden hour sunset with warm light' },
  { value: 'night', label: 'Rue de nuit', icon: 'moon-outline', prompt: 'change the background to a city street at night with colorful bokeh lights, cinematic' },
  { value: 'cinema', label: 'Fond noir ciné', icon: 'film-outline', prompt: 'change the background to a plain black cinematic backdrop with dramatic studio lighting' },
  { value: 'nature', label: 'Nature / forêt', icon: 'leaf-outline', prompt: 'change the background to a lush green forest with soft natural daylight' },
  { value: 'snow', label: 'Neige', icon: 'snow-outline', prompt: 'change the background to a snowy winter landscape with soft cold light' },
  { value: 'custom', label: 'Scène perso', icon: 'sparkles-outline', prompt: '' },
]

// Server-side billing of POST /api/motion (lib/tool-costs.ts estimateGenjutsuPriceUsd
// + lib/jetons.ts providerCostToJetons). Motion Control sends the reference
// duration (10 s max); image animation keeps the server default (30 s).
const ANIMATION_BILLED_SECONDS = 30
const PROVIDER_COST_PER_SECOND_USD = 0.2708333333
const MARGIN_MULTIPLIER = 2.5
const JETONS_PER_USD = 60
const FCFA_PER_JETON = 10
const motionCostJetons = (seconds) => {
  const providerUsd = Math.round(PROVIDER_COST_PER_SECOND_USD * seconds * 10000) / 10000
  const customerUsd = Math.round(providerUsd * MARGIN_MULTIPLIER * 10000) / 10000
  return Math.max(1, Math.ceil(customerUsd * JETONS_PER_USD))
}
const billedReferenceSeconds = (seconds) =>
  Math.min(MOTION_MAX_SECONDS, Math.max(1, Math.ceil(seconds ?? MOTION_MAX_SECONDS)))

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Session expirée. Reconnecte-toi pour continuer.')
  return { Authorization: `Bearer ${token}` }
}

function videoContentType(asset) {
  const mime = asset?.mimeType || ''
  if (mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/quicktime') return mime
  const name = (asset?.fileName || asset?.uri || '').toLowerCase()
  if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4'
  if (name.endsWith('.webm')) return 'video/webm'
  return 'video/quicktime'
}

function imageContentType(asset) {
  const mime = asset?.mimeType || ''
  return mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg'
}

const assetSeconds = (asset) => (typeof asset?.duration === 'number' && asset.duration > 0 ? asset.duration / 1000 : null)

async function pickMedia(mediaTypes) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) {
    Alert.alert('Photos', 'Autorise ChapCam à accéder à tes photos dans Réglages.')
    return null
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, allowsEditing: false, quality: 0.9 })
  return result.canceled ? null : result.assets?.[0] ?? null
}

function LoopVideo({ uri, style, controls = false }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = !controls; p.play() })
  return <VideoView player={player} style={style} contentFit="cover" nativeControls={controls} />
}

function UploadCard({ label, hint, icon, item, onPick, onClear, disabled }) {
  return (
    <Pressable onPress={onPick} disabled={disabled} style={styles.upload} accessibilityRole="button" accessibilityLabel={label}>
      {item ? (
        item.type === 'video' ? <LoopVideo uri={item.uri} style={styles.media} /> : <Image source={{ uri: item.uri }} style={styles.media} resizeMode="cover" />
      ) : (
        <>
          <View style={styles.uploadIcon}><Ionicons name={icon} size={24} color={C.violet} /></View>
          <Text style={styles.uploadTitle}>{label}</Text>
          <Text style={styles.uploadHint}>{hint}</Text>
        </>
      )}
      {item && !disabled ? (
        <Pressable onPress={onClear} style={styles.remove} accessibilityRole="button" accessibilityLabel={`Retirer : ${label}`}>
          <Ionicons name="close" size={17} color={C.white} />
        </Pressable>
      ) : null}
    </Pressable>
  )
}

function Chip({ label, selected, disabled, onPress, icon, hint }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.chip, selected && styles.chipActive, disabled && !selected && styles.chipLocked]} accessibilityRole="button" accessibilityState={{ selected, disabled }} accessibilityHint={hint}>
      {icon ? <Ionicons name={icon} size={14} color={selected ? C.white : C.ink} /> : null}
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

export function MotionControlScreen({ onBack, onOpenCreations, topInset = 0 }) {
  const [image, setImage] = useState(null)
  const [reference, setReference] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [scene, setScene] = useState('keep')
  const [customScene, setCustomScene] = useState('')
  const [model, setModel] = useState('standard')
  const [quality, setQuality] = useState('720p')
  const [enhance, setEnhance] = useState(true)
  const [motions, setMotions] = useState([])
  const [motionsLoading, setMotionsLoading] = useState(true)
  const [selectedMotions, setSelectedMotions] = useState([])
  const [showMotions, setShowMotions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')
  const [message, setMessage] = useState(null)
  const [pendingRequestId, setPendingRequestId] = useState(null)
  const [resultUrl, setResultUrl] = useState(null)
  const balance = useJetonsBalance()
  const reloadBalance = balance.reload

  const busy = loading || !!pendingRequestId
  const sceneActive = scene === 'custom' ? !!customScene.trim() : scene !== 'keep'
  const referenceDuration = assetSeconds(reference)
  const referenceBilledSeconds = billedReferenceSeconds(referenceDuration)
  const COST = motionCostJetons(reference?.uri ? referenceBilledSeconds : ANIMATION_BILLED_SECONDS)
  const ready = !!image?.uri && (!!reference?.uri || !!prompt.trim() || selectedMotions.length > 0 || sceneActive) && !busy

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`${API_URL}/api/motion?info=motions`, { headers })
        const json = res.ok ? await res.json() : { motions: [] }
        if (!cancelled && Array.isArray(json.motions)) {
          setMotions(json.motions.filter((m) => m && typeof m.id === 'string' && typeof m.name === 'string'))
        }
      } catch {
        // Presets are optional, exactly like the web page.
      } finally {
        if (!cancelled) setMotionsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!pendingRequestId) return undefined
    const interval = setInterval(async () => {
      try {
        const headers = await authHeaders()
        const res = await fetch(`${API_URL}/api/motion?request_id=${encodeURIComponent(pendingRequestId)}`, { headers })
        const result = await res.json().catch(() => ({}))
        if (result.status === 'completed' && result.video_url) {
          setPendingRequestId(null)
          setResultUrl(result.video_url)
          reloadBalance()
          setMessage({ tone: 'success', text: 'Vidéo prête ! Ton clip Motion est enregistré dans Mes créations.' })
        } else if (result.status === 'failed' || result.status === 'nsfw') {
          setPendingRequestId(null)
          reloadBalance()
          const moderated = result.code === 'moderation' || result.status === 'nsfw'
          setMessage({
            tone: 'error',
            text: `${moderated ? 'Génération refusée. ' : ''}${result.error || "La vidéo n'a pas pu être générée."}${result.refunded ? ' Tes jetons ont été remboursés.' : ''}`,
          })
        }
      } catch {
        // Retry on next tick.
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [pendingRequestId, reloadBalance])

  const pickImage = async () => {
    const asset = await pickMedia(['images'])
    if (!asset) return
    if (asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType) && !asset.mimeType.startsWith('image/hei')) {
      Alert.alert('Format invalide', 'JPG, PNG ou WebP uniquement.')
      return
    }
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_IMAGE_BYTES) {
      Alert.alert('Fichier trop volumineux', 'Max 10 Mo.')
      return
    }
    setImage(asset)
  }

  const pickReference = async () => {
    const asset = await pickMedia(['videos'])
    if (!asset) return
    if (typeof asset.fileSize === 'number' && asset.fileSize > MAX_REFERENCE_BYTES) {
      Alert.alert('Vidéo trop volumineuse', 'Max 30 Mo (une vidéo de 10 s est légère).')
      return
    }
    const seconds = assetSeconds(asset)
    if (seconds !== null && seconds > MOTION_MAX_SECONDS + 0.5) {
      Alert.alert('Vidéo trop longue', `La vidéo de référence doit durer ${MOTION_MAX_SECONDS} s maximum (la tienne fait ${Math.round(seconds)} s). Découpe-la puis réessaie.`)
      return
    }
    setReference({ ...asset, type: 'video' })
  }

  const toggleMotion = (id) => {
    setSelectedMotions((current) => {
      if (current.includes(id)) return current.filter((m) => m !== id)
      if (current.length >= MAX_PRESETS) return current
      return [...current, id]
    })
  }

  const composePrompt = useCallback(() => {
    const scenePrompt = scene === 'custom'
      ? (customScene.trim() ? `change the background: ${customScene.trim()}` : '')
      : SCENES.find((s) => s.value === scene)?.prompt || ''
    return [prompt.trim(), scenePrompt].filter(Boolean).join('. ')
  }, [prompt, scene, customScene])

  const onGenerate = useCallback(async () => {
    if (!image) {
      setMessage({ tone: 'error', text: 'Ajoute la photo de la personne pour démarrer.' })
      return
    }
    if (!reference && !prompt.trim() && selectedMotions.length === 0 && !sceneActive) {
      setMessage({ tone: 'error', text: 'Ajoute une vidéo de référence, un prompt, une scène ou un preset.' })
      return
    }
    if (balance.jetons !== null && balance.jetons < COST) {
      setMessage({ tone: 'error', text: `Solde insuffisant : ${COST.toLocaleString('fr-FR')} Jetons requis.` })
      return
    }

    setLoading(true)
    setResultUrl(null)
    setMessage(null)
    try {
      const headers = await authHeaders()
      const finalPrompt = composePrompt()
      const form = new FormData()
      form.append('file', { uri: image.uri, name: 'image.jpg', type: imageContentType(image) })
      form.append('quality', quality)
      form.append('enhance', String(enhance))
      if (selectedMotions.length > 0) form.append('motions', JSON.stringify(selectedMotions))

      if (reference) {
        const contentType = videoContentType(reference)
        setStage('Préparation de la vidéo de référence…')
        const uploadRes = await fetch(`${API_URL}/api/motion/upload`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentType }),
        })
        const upload = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok || typeof upload.signedUrl !== 'string' || typeof upload.publicUrl !== 'string') {
          throw new Error(upload.error || 'Impossible de préparer la vidéo.')
        }
        setStage('Envoi de la vidéo de référence…')
        const videoBlob = await (await fetch(reference.uri)).blob()
        const putRes = await fetch(upload.signedUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: videoBlob })
        if (!putRes.ok) throw new Error("Échec de l'upload de la vidéo de référence.")
        form.append('referenceVideoUrl', upload.publicUrl)
        form.append('prompt', finalPrompt || 'natural full-body motion transfer')
        form.append('model', 'kling3')
        form.append('durationSeconds', String(referenceBilledSeconds))
      } else {
        form.append('prompt', finalPrompt || 'subtle natural motion, cinematic')
        form.append('model', model === 'pro' ? 'standard' : model)
      }

      setStage('Lancement de Motion Control…')
      const res = await fetch(`${API_URL}/api/motion`, { method: 'POST', headers, body: form })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 402) throw new Error(result.error || 'Solde insuffisant.')
        if (res.status === 422 || result.code === 'moderation') throw new Error(result.error || 'Image ou vidéo refusée par la modération.')
        throw new Error(result.error || 'Impossible de lancer le transfert de mouvement.')
      }
      if (typeof result.request_id === 'string' && result.request_id) setPendingRequestId(result.request_id)
      reloadBalance()
      setMessage({
        tone: 'info',
        text: reference
          ? 'Motion Control lancé : Kling 3.0 traite ta vidéo de référence. Le résultat sera enregistré dans Mes créations.'
          : 'Génération lancée (1 à 3 min). Le résultat sera enregistré dans Mes créations.',
      })
    } catch (error) {
      setMessage({ tone: 'error', text: friendlyError(error) })
    } finally {
      setStage('')
      setLoading(false)
    }
  }, [image, reference, prompt, selectedMotions, sceneActive, balance.jetons, composePrompt, quality, enhance, model, reloadBalance])

  const [rightsOk, setRightsOk] = useState(false)

  return (
    <KeyboardAvoidingView style={[styles.root, { paddingTop: topInset }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topbar}>
        <Pressable onPress={onBack} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="chevron-back" size={25} color={C.ink} /></Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Motion Control</Text>
          <Text style={styles.subtitle}>Anime une image avec un mouvement contrôlé.</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>IMAGE ET RÉFÉRENCE</Text>
        <View style={styles.uploadRow}>
          <UploadCard label="Image sujet *" hint="JPG, PNG ou WebP · 10 Mo max" icon="image-outline" item={image} disabled={busy} onPick={pickImage} onClear={() => setImage(null)} />
          <UploadCard label="Vidéo de référence" hint={`Optionnelle · ${MOTION_MAX_SECONDS} s max`} icon="videocam-outline" item={reference} disabled={busy} onPick={pickReference} onClear={() => setReference(null)} />
        </View>
        <Text style={styles.note}>
          {reference
            ? `Mode transfert de mouvement : le personnage de ton image reproduira les mouvements de la vidéo de référence (Kling Motion Control). Le clip généré dure comme la référence${referenceDuration !== null ? ` (${Math.round(referenceDuration)} s)` : ''}, ${MOTION_MAX_SECONDS} s maximum.`
            : `Ajoute une vidéo de référence (${MOTION_MAX_SECONDS} s max) pour transférer son mouvement, ou laisse vide et décris le mouvement au prompt pour une simple animation.`}
        </Text>

        <Text style={styles.sectionLabel}>SCÈNE</Text>
        <View style={styles.chips}>
          {SCENES.map((s) => (
            <Chip key={s.value} label={s.label} icon={s.icon} selected={scene === s.value} disabled={busy} onPress={() => setScene(s.value)} />
          ))}
        </View>
        {scene === 'custom' ? (
          <View style={styles.promptCardSmall}>
            <TextInput value={customScene} onChangeText={setCustomScene} editable={!busy} maxLength={200} placeholder="Décris le décor (ex. un toit de Paris au crépuscule)" placeholderTextColor={C.muted} style={styles.inputSmall} accessibilityLabel="Scène personnalisée" />
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>PROMPT</Text>
        <View style={styles.promptCard}>
          <TextInput value={prompt} onChangeText={setPrompt} multiline maxLength={MAX_PROMPT} editable={!busy} placeholder="Décris le mouvement ou le comportement souhaité…" placeholderTextColor={C.muted} style={styles.input} textAlignVertical="top" accessibilityLabel="Prompt" />
          <Text style={styles.counter}>{`${prompt.length}/${MAX_PROMPT}`}</Text>
        </View>

        <Text style={styles.sectionLabel}>PARAMÈTRES</Text>
        <View style={styles.settings}>
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Enhance</Text>
              <Text style={styles.settingHint}>Optimise automatiquement ton prompt.</Text>
            </View>
            <Switch value={enhance} onValueChange={setEnhance} disabled={busy} trackColor={{ true: C.violet, false: C.line }} accessibilityLabel="Enhance" />
          </View>

          {motionsLoading || motions.length > 0 ? (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.flex}>
                  <Text style={styles.settingTitle}>Bibliothèque de mouvements</Text>
                  <Text style={styles.settingHint}>{`Jusqu'à ${MAX_PRESETS} presets · ${selectedMotions.length}/${MAX_PRESETS}`}</Text>
                </View>
                {motionsLoading ? (
                  <ChapCamLoader size="small" />
                ) : (
                  <Pressable onPress={() => setShowMotions((v) => !v)} style={styles.toggle} accessibilityRole="button" accessibilityState={{ expanded: showMotions }}>
                    <Text style={styles.toggleText}>{showMotions ? 'Masquer' : 'Voir'}</Text>
                  </Pressable>
                )}
              </View>
              {showMotions ? (
                <View style={styles.chips}>
                  {motions.map((m) => {
                    const selected = selectedMotions.includes(m.id)
                    const locked = !selected && selectedMotions.length >= MAX_PRESETS
                    return <Chip key={m.id} label={m.name} hint={m.description} selected={selected} disabled={busy || locked} onPress={() => toggleMotion(m.id)} />
                  })}
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.settingTitle}>Modèle de rendu</Text>
          {reference ? (
            <View style={styles.modelFixed}>
              <Ionicons name="flash" size={16} color={C.violet} />
              <Text style={styles.modelFixedText}>Kling 3.0 · Motion Control ChapCam</Text>
            </View>
          ) : (
            <View style={styles.models}>
              {ANIMATION_MODELS.map((m) => {
                const active = model === m.value
                return (
                  <Pressable key={m.value} onPress={() => setModel(m.value)} disabled={busy} style={[styles.modelCard, active && styles.modelCardActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                    <Text style={[styles.modelTitle, active && styles.modelTitleActive]}>{m.label}</Text>
                    <Text style={[styles.modelDesc, active && styles.modelDescActive]}>{m.desc}</Text>
                  </Pressable>
                )
              })}
            </View>
          )}

          <View style={styles.divider} />
          <Text style={styles.settingTitle}>{"Qualité d'export"}</Text>
          <View style={styles.segment}>
            {QUALITIES.map((q) => {
              const active = quality === q.value
              return (
                <Pressable key={q.value} onPress={() => setQuality(q.value)} disabled={busy} style={[styles.segmentItem, active && styles.segmentActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{q.label}</Text>
                  <Text style={[styles.segmentDesc, active && styles.segmentTextActive]}>{q.desc}</Text>
                </Pressable>
              )
            })}
          </View>
          <View style={styles.divider} />
          <View style={styles.settingRow}>
            <View style={styles.flex}>
              <Text style={styles.settingTitle}>Durée</Text>
              <Text style={styles.settingHint}>{reference ? `Identique à la vidéo de référence · ${MOTION_MAX_SECONDS} s max` : 'Définie par le modèle de rendu'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.costRow}>
            <View>
              <Text style={styles.costLabel}>Coût</Text>
              <Text style={styles.costValue}>{`${COST.toLocaleString('fr-FR')} Jetons`}</Text>
              <Text style={styles.costSub}>{`${(COST * FCFA_PER_JETON).toLocaleString('fr-FR')} FCFA`}</Text>
            </View>
            <View style={styles.balanceBox}>
              <Text style={styles.costLabel}>Ton solde</Text>
              {balance.loading ? (
                <ChapCamLoader size="small" />
              ) : balance.jetons !== null ? (
                <Text style={styles.balanceValue}>{`${balance.jetons.toLocaleString('fr-FR')} Jetons`}</Text>
              ) : (
                <Pressable onPress={balance.reload} accessibilityRole="button"><Text style={styles.balanceError}>Indisponible · Réessayer</Text></Pressable>
              )}
            </View>
          </View>

          {message ? (
            <View style={[styles.message, message.tone === 'error' && styles.messageError, message.tone === 'success' && styles.messageSuccess]} accessibilityLiveRegion="polite">
              <Text style={[styles.messageText, message.tone === 'error' && styles.messageTextError]}>{message.text}</Text>
            </View>
          ) : null}

          {pendingRequestId ? (
            <View style={styles.progress} accessibilityLiveRegion="polite">
              <ChapCamLoader size="small" />
              <Text style={styles.progressText}>Rendu en cours… tu peux quitter l'écran, la vidéo sera enregistrée dans Mes créations.</Text>
            </View>
          ) : null}

          {resultUrl ? (
            <View style={styles.result}>
              <AiBadge />
              <LoopVideo uri={resultUrl} style={styles.resultVideo} controls />
              <ReportAbuseButton contentUrl={resultUrl} context="Motion Control" />
            </View>
          ) : null}

          <RightsConsent checked={rightsOk} onChange={setRightsOk} disabled={busy} />

          {resultUrl && onOpenCreations ? (
            <Pressable onPress={onOpenCreations} style={styles.creations} accessibilityRole="button">
              <Ionicons name="albums-outline" size={18} color={C.blue} />
              <Text style={styles.creationsText}>Voir dans Mes créations</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={onGenerate} disabled={!ready || !rightsOk} style={[styles.generate, (!ready || !rightsOk) && styles.generateDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !ready || !rightsOk, busy: loading }}>
            {loading ? (
              <>
                <ChapCamLoader size="small" />
                <Text style={styles.generateText}>{stage || 'Génération…'}</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color={C.white} />
                <Text style={styles.generateText}>{`Générer · ${COST.toLocaleString('fr-FR')} Jetons`}</Text>
              </>
            )}
          </Pressable>
          {!image ? <Text style={styles.footHint}>Ajoute une image sujet pour continuer.</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, paddingVertical: 16, gap: 10, borderBottomWidth: 1, borderBottomColor: '#E7EAF3' },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  titleWrap: { flex: 1 },
  title: { color: C.ink, fontSize: 21, fontWeight: '900' },
  subtitle: { color: C.muted, fontSize: 12, marginTop: 3 },
  content: { padding: PAD, gap: 12, paddingBottom: 36 },
  sectionLabel: { color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 10 },
  uploadRow: { flexDirection: 'row', gap: 12 },
  upload: { flex: 1, height: 210, borderRadius: 24, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 },
  uploadIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F0EBFF', alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { color: C.ink, fontSize: 15, fontWeight: '900', marginTop: 10, textAlign: 'center' },
  uploadHint: { color: C.muted, fontSize: 12, marginTop: 4, textAlign: 'center' },
  media: { ...StyleSheet.absoluteFillObject },
  remove: { position: 'absolute', right: 10, top: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(11,18,51,0.8)', alignItems: 'center', justifyContent: 'center' },
  note: { color: C.muted, fontSize: 12, lineHeight: 18 },
  promptCard: { minHeight: 150, backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16 },
  promptCardSmall: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: '#E2E6F1', paddingHorizontal: 14, paddingVertical: 4 },
  input: { flex: 1, minHeight: 105, color: C.ink, fontSize: 16, lineHeight: 24 },
  inputSmall: { minHeight: 44, color: C.ink, fontSize: 15 },
  counter: { color: C.muted, fontSize: 11, textAlign: 'right' },
  settings: { backgroundColor: C.white, borderRadius: 24, borderWidth: 1, borderColor: '#E2E6F1', padding: 16, gap: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingTitle: { color: C.ink, fontSize: 14, fontWeight: '800' },
  settingHint: { color: C.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  divider: { height: 1, backgroundColor: C.line, marginVertical: 4 },
  toggle: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: '#F0EBFF' },
  toggleText: { color: C.violet, fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' },
  chipActive: { backgroundColor: C.navy, borderColor: C.navy },
  chipLocked: { opacity: 0.4 },
  chipText: { color: C.ink, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: C.white },
  models: { flexDirection: 'row', gap: 10 },
  modelCard: { flex: 1, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E2E6F1', backgroundColor: '#F7F8FC' },
  modelCardActive: { backgroundColor: C.navy, borderColor: C.navy },
  modelTitle: { color: C.ink, fontSize: 14, fontWeight: '900' },
  modelTitleActive: { color: C.white },
  modelDesc: { color: C.muted, fontSize: 11, marginTop: 4, lineHeight: 15 },
  modelDescActive: { color: 'rgba(255,255,255,0.7)' },
  modelFixed: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: '#F0EBFF' },
  modelFixedText: { color: C.ink, fontSize: 13, fontWeight: '800' },
  segment: { flexDirection: 'row', backgroundColor: '#F1F3FA', borderRadius: 14, padding: 3 },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 11 },
  segmentActive: { backgroundColor: C.navy },
  segmentText: { color: C.ink, fontWeight: '900', fontSize: 14 },
  segmentDesc: { color: C.muted, fontSize: 10, fontWeight: '700', marginTop: 2 },
  segmentTextActive: { color: C.white },
  footer: { gap: 12, marginTop: 6 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', backgroundColor: C.white, borderRadius: 20, borderWidth: 1, borderColor: '#E2E6F1', padding: 16 },
  costLabel: { color: C.muted, fontSize: 12, fontWeight: '700' },
  costValue: { color: C.ink, fontSize: 20, fontWeight: '900', marginTop: 3 },
  costSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  balanceBox: { alignItems: 'flex-end', gap: 3 },
  balanceValue: { color: C.ink, fontSize: 15, fontWeight: '900' },
  balanceError: { color: '#B42318', fontSize: 12, fontWeight: '800' },
  message: { borderRadius: 16, padding: 13, backgroundColor: '#EEF2FF' },
  messageError: { backgroundColor: '#FEF3F2' },
  messageSuccess: { backgroundColor: '#ECFDF3' },
  messageText: { color: C.ink, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  messageTextError: { color: '#B42318' },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 16, backgroundColor: C.white, borderWidth: 1, borderColor: '#E2E6F1' },
  progressText: { flex: 1, color: C.muted, fontSize: 12, lineHeight: 17 },
  result: { borderRadius: 22, overflow: 'hidden', backgroundColor: C.navy },
  resultVideo: { width: '100%', aspectRatio: 9 / 16, maxHeight: 460 },
  creations: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF' },
  creationsText: { color: C.blue, fontSize: 14, fontWeight: '900' },
  generate: { height: 58, borderRadius: 29, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  generateDisabled: { opacity: 0.45 },
  generateText: { color: C.white, fontSize: 16, fontWeight: '900' },
  footHint: { color: C.muted, fontSize: 12, textAlign: 'center' },
})
