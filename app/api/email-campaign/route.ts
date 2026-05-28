import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Laisse le temps d'envoyer tous les batches (Vercel: max 300s en Pro)
export const maxDuration = 300

// Validation stricte du format d'adresse email.
// Resend rejette TOUT un batch si une seule adresse est mal formee,
// donc on filtre les adresses invalides en amont.
function isValidEmail(email: string): boolean {
  if (!email) return false
  // Pas d'espace, un seul @, un domaine avec un point et une extension
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

// Lazy initialization to avoid build-time errors
function getResend() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }
  return new Resend(apiKey)
}

// Template email pour le rappel de lancement
function getLaunchReminderEmail(userName: string, type: 'D2' | 'D1' | 'DJ') {
  const subjects = {
    D2: "J-2 - Lancement ChapCam Samedi a 19h GMT !",
    D1: "DEMAIN - Lancement ChapCam a 19h GMT !",
    DJ: "MAINTENANT - ChapCam est LIVE !"
  }
  
  const titles = {
    D2: "Plus que 2 jours !",
    D1: "C'est DEMAIN !",
    DJ: "C'est MAINTENANT !"
  }
  
  const messages = {
    D2: "arrive dans 2 jours",
    D1: "arrive demain",
    DJ: "c'est maintenant"
  }
  
  const subject = subjects[type]
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #00ff88; font-size: 32px; margin: 0;">ChapCam</h1>
      <p style="color: #888; font-size: 14px; margin-top: 5px;">Face Swap en Temps Reel</p>
    </div>
    
    <!-- Main Content -->
    <div style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 20px; padding: 30px; text-align: center;">
      
      <!-- Rocket Icon -->
      <div style="font-size: 60px; margin-bottom: 20px;">🚀</div>
      
      <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 10px 0;">
        ${titles[type]}
      </h2>
      
      <p style="color: #00ff88; font-size: 20px; font-weight: bold; margin: 0 0 20px 0;">
        Samedi 30 Mai - 19h GMT
      </p>
      
      <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Salut ${userName || 'toi'} ! Le lancement officiel de ChapCam ${messages[type]}. 
        Ne rate pas les offres exceptionnelles de lancement !
      </p>
      
      <!-- Offers Box -->
      <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <p style="color: #00ff88; font-weight: bold; margin: 0 0 10px 0;">Offres de Lancement :</p>
        <p style="color: #ffffff; margin: 5px 0;">✓ Jusqu'a <strong>-29%</strong> sur tous les plans</p>
        <p style="color: #ffffff; margin: 5px 0;">✓ Avatars exclusifs offerts</p>
        <p style="color: #ffffff; margin: 5px 0;">✓ Support prioritaire</p>
      </div>
      
      <!-- CTA Button -->
      <a href="https://chapcam.com/#tarifs" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-weight: bold; font-size: 16px; padding: 15px 40px; border-radius: 12px; text-decoration: none; margin-bottom: 20px;">
        Voir les Offres
      </a>
      
      <p style="color: #888888; font-size: 12px; margin-top: 20px;">
        Places limitees - Offre valable uniquement pendant le lancement
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 30px;">
      <p style="color: #666666; font-size: 12px;">
        Tu recois cet email car tu es inscrit sur ChapCam.<br>
        <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
  
  return { subject, html }
}

// POST - Envoyer campagne email (admin only)
export async function POST(request: NextRequest) {
  try {
    // Verifier auth admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.email || user.email !== 'fanny.guck@gmail.com') {
      return NextResponse.json({ error: 'Non autorise' }, { status: 403 })
    }
    
    const body = await request.json()
    const { type } = body // 'D2', 'D1' ou 'DJ'
    
    if (!type || !['D2', 'D1', 'DJ'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide. Utilise D2, D1 ou DJ' }, { status: 400 })
    }
    
    // Recuperer TOUS les utilisateurs via le client admin (service_role)
    // On lit les emails directement depuis auth.users (toujours rempli)
    const admin = createAdminClient()
    const allUsers: { email: string; name: string }[] = []
    let skippedInvalid = 0
    const invalidSamples: string[] = []

    let page = 1
    const perPage = 1000
    // Pagination pour recuperer tous les utilisateurs
    while (true) {
      const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage })

      if (listError) {
        console.error('[Email Campaign] Erreur listUsers:', listError)
        return NextResponse.json({ error: 'Impossible de recuperer les utilisateurs' }, { status: 500 })
      }

      const batch = data?.users ?? []
      for (const u of batch) {
        if (!u.email) continue
        // Nettoyage + validation stricte de l'adresse.
        // Une seule adresse invalide fait echouer TOUT le batch Resend, on les exclut donc ici.
        const email = u.email.trim().toLowerCase()
        if (!isValidEmail(email)) {
          skippedInvalid++
          if (invalidSamples.length < 20) invalidSamples.push(u.email)
          continue
        }
        const name = (u.user_metadata?.name as string) || email.split('@')[0]
        allUsers.push({ email, name })
      }

      if (batch.length < perPage) break
      page++
    }

    // 4) Nombre exact d'utilisateurs trouves
    console.log(`[Email Campaign] ${allUsers.length} adresses valides retenues (${skippedInvalid} adresses invalides ignorees)`)
    if (skippedInvalid > 0) {
      console.log('[Email Campaign] Exemples d\'adresses invalides ignorees:', invalidSamples.join(', '))
    }

    if (!allUsers.length) {
      return NextResponse.json({ error: 'Aucun utilisateur valide trouve' }, { status: 404 })
    }

    let successCount = 0
    let errorCount = 0
    // 6) Logs detailles des erreurs Resend (echantillon renvoye au client)
    const errorSamples: { email: string; error: string }[] = []

    const resend = getResend()

    // 5) Envoyer via l'API BATCH de Resend : jusqu'a 100 emails en 1 seule requete.
    // Cela contourne la limite "5 requetes/seconde" (un batch = 1 requete).
    const batchSize = 100
    const totalBatches = Math.ceil(allUsers.length / batchSize)

    for (let i = 0; i < allUsers.length; i += batchSize) {
      const batchIndex = Math.floor(i / batchSize) + 1
      const batch = allUsers.slice(i, i + batchSize)

      // Construit le payload du batch
      const payload = batch
        .filter((u) => u.email)
        .map((user) => {
          const { subject, html } = getLaunchReminderEmail(user.name || '', type as 'D2' | 'D1' | 'DJ')
          return {
            from: 'ChapCam <noreply@chapcam.com>',
            to: user.email,
            subject,
            html,
          }
        })

      try {
        const { data, error } = await resend.batch.send(payload)

        if (error) {
          // Le batch est rejete en bloc. On compte les echecs SANS retry lent
          // (le retry un-par-un faisait timeout la fonction -> "Failed to fetch").
          errorCount += payload.length
          const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error))
          console.error(`[Email Campaign] Batch ${batchIndex}/${totalBatches} rejete:`, msg)
          if (errorSamples.length < 20) {
            errorSamples.push({ email: `batch ${batchIndex} (${payload.length} emails)`, error: msg })
          }
        } else {
          // data.data = tableau d'objets { id } pour chaque email accepte
          const accepted = data?.data?.length ?? 0
          successCount += accepted
          if (accepted < payload.length) {
            errorCount += payload.length - accepted
          }
        }
      } catch (err: any) {
        errorCount += payload.length
        const msg = err?.message || String(err)
        console.error(`[Email Campaign] Exception batch ${batchIndex}/${totalBatches}:`, msg)
        if (errorSamples.length < 20) {
          errorSamples.push({ email: `batch ${batchIndex} (${payload.length} emails)`, error: msg })
        }
      }

      console.log(`[Email Campaign] Batch ${batchIndex}/${totalBatches} traite (succes cumules: ${successCount}, erreurs: ${errorCount})`)

      // Petite pause entre les batches pour rester sous la limite de debit
      if (i + batchSize < allUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
    }

    console.log(`[Email Campaign] TERMINE - total: ${allUsers.length}, succes: ${successCount}, erreurs: ${errorCount}`)

    return NextResponse.json({
      success: true,
      sent: successCount,
      message: `Campagne ${type}: ${successCount} email(s) envoye(s) sur ${allUsers.length} adresse(s) valide(s)${
        skippedInvalid > 0 ? ` (${skippedInvalid} adresse(s) invalide(s) ignoree(s))` : ''
      }`,
      stats: {
        total: allUsers.length,
        success: successCount,
        errors: errorCount,
        skippedInvalid,
      },
      // 6) Echantillon d'erreurs Resend pour diagnostic immediat dans l'UI
      errorSamples,
    })
    
  } catch (error: any) {
    console.error('[Email Campaign] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
