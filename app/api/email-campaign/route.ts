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

// Template email pour la campagne "ChapCam PC a vie" (offre de lancement).
// 50 000 FCFA paiement unique a vie pour les premiers, puis 50 000 FCFA/mois
// a partir du dimanche 14 juin.
function getPcLifetimeEmail(userName: string) {
  const subject = "ChapCam PC a VIE pour 50 000 FCFA - l'offre se termine bientot !"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 24px; border: 1px solid rgba(0, 255, 136, 0.3); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(90deg, #7c3aed, #2563eb, #00ff88); padding: 22px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">ChapCam PC - Logiciel a VIE</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 38px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 18px;">Salut ${userName || 'toi'},</p>

              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 18px;">
                Le face swap en temps reel le plus rapide tourne directement sur ton PC,
                sans abonnement et sans cloud. En ce moment, tu peux l'avoir
                <strong style="color: #ffffff;">a VIE</strong> pour un paiement unique.
              </p>

              <!-- Price Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.35); border-radius: 16px; margin: 24px 0;">
                <tr>
                  <td style="padding: 26px; text-align: center;">
                    <p style="color: #00ff88; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Offre de lancement - a VIE</p>
                    <p style="color: #ffffff; font-size: 40px; font-weight: 800; margin: 0;">50 000 FCFA</p>
                    <p style="color: #a0a0a0; font-size: 14px; margin: 6px 0 0;">paiement unique - acces illimite a vie</p>
                  </td>
                </tr>
              </table>

              <!-- Urgency Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(239, 68, 68, 0.12); border: 1px dashed rgba(239, 68, 68, 0.5); border-radius: 14px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 18px; text-align: center;">
                    <p style="color: #f87171; font-size: 15px; font-weight: bold; margin: 0 0 4px;">A partir du dimanche 14 juin</p>
                    <p style="color: #e5e5e5; font-size: 15px; margin: 0;">l'offre a vie disparait. Le logiciel passe a
                    <strong style="color: #ffffff;">50 000 FCFA / mois</strong> (acces illimite egalement).</p>
                  </td>
                </tr>
              </table>

              <p style="color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Ce que tu obtiens :</p>
              <p style="color: #ffffff; font-size: 15px; margin: 4px 0;">&#10003; Face swap temps reel sur ton GPU local</p>
              <p style="color: #ffffff; font-size: 15px; margin: 4px 0;">&#10003; Camera virtuelle (WhatsApp, Zoom, Discord, TikTok Live)</p>
              <p style="color: #ffffff; font-size: 15px; margin: 4px 0;">&#10003; Aucun abonnement si tu prends l'offre a vie</p>
              <p style="color: #ffffff; font-size: 15px; margin: 4px 0;">&#10003; Cle de licence + lien de telechargement par email</p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 28px 0 8px;">
                    <a href="https://chapcam.com/dashboard/chapcam-pc" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 44px; border-radius: 12px;">
                      J'obtiens ChapCam PC a vie
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 13px; text-align: center; margin: 16px 0 0;">
                Configuration : installable sur tout type de PC, mais necessite une carte graphique GPU dediee (type PC Gamer).
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 38px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                Tu recois cet email car tu es inscrit sur ChapCam.<br>
                <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  return { subject, html }
}

// Template email pour la campagne "Appels video" (face swap en temps reel
// pendant les appels video sur les reseaux sociaux). Installation sur place a
// Yopougon Niangon (station Texaco) ou assistance a distance. CTA: telecharger.
function getVideoCallEmail(userName: string) {
  const subject = "Change ton apparence pendant tes appels video - ChapCam"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 24px; border: 1px solid rgba(0, 255, 136, 0.3); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(90deg, #00ff88, #00d4ff); padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #001b12; font-size: 24px; font-weight: 800;">ChapCam - Face Swap en temps reel</h1>
            </td>
          </tr>

          <!-- Hero text (lisible meme si images bloquees) -->
          <tr>
            <td style="padding: 36px 38px 8px;">
              <p style="color: #ffffff; font-size: 17px; margin: 0 0 14px;">Salut ${userName || 'toi'},</p>
              <h2 style="color: #ffffff; font-size: 26px; line-height: 1.25; font-weight: 800; margin: 0 0 14px;">
                Tu veux changer ton apparence pendant tes
                <span style="color: #00ff88;">appels video</span> sur les reseaux sociaux ?
              </h2>
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0;">
                Avec ChapCam, transforme ton visage <strong style="color:#ffffff;">en direct</strong> sur WhatsApp,
                Messenger, Zoom, TikTok Live et plus encore. Simple, rapide, et bluffant de realisme.
              </p>
            </td>
          </tr>

          <!-- Testimonial image -->
          <tr>
            <td style="padding: 22px 38px;">
              <a href="https://chapcam.com/download" style="text-decoration: none;">
                <img src="https://chapcam.com/campagne/temoignage-chapcam.jpg" alt="Temoignage client ChapCam" width="524" style="width: 100%; max-width: 524px; border-radius: 16px; display: block; border: 1px solid rgba(255,255,255,0.1);">
              </a>
            </td>
          </tr>

          <!-- Installation box -->
          <tr>
            <td style="padding: 4px 38px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.3); border-radius: 16px;">
                <tr>
                  <td style="padding: 22px;">
                    <p style="color: #00d4ff; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 10px;">On s'occupe de tout</p>
                    <p style="color: #ffffff; font-size: 15px; margin: 0 0 6px;">&#10003; Installation sur place a <strong>Yopougon Niangon</strong> (station Texaco)</p>
                    <p style="color: #ffffff; font-size: 15px; margin: 0;">&#10003; Ou assistance <strong>a distance</strong>, ou que tu sois</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding: 26px 38px 10px;">
              <a href="https://chapcam.com/download" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 44px; border-radius: 12px;">
                Telecharger ChapCam maintenant
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 38px 30px;">
              <p style="color: #888888; font-size: 13px; margin: 8px 0 0;">
                Besoin d'aide ? Ecris-nous sur WhatsApp au <strong style="color:#e5e5e5;">+225 05 55 56 01 89</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 38px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                Tu recois cet email car tu es inscrit sur ChapCam.<br>
                <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  return { subject, html }
}

// Template email pour la campagne "Assistance / Support".
// Objectif : savoir si le client arrive a utiliser le logiciel IA et lui proposer
// une aide immediate via WhatsApp ou un appel telephonique.
function getSupportEmail(userName: string) {
  const subject = 'Rencontres-tu un problème avec ChapCam ? On t\'aide'
  const WHATSAPP_URL =
    'https://wa.me/2250555560189?text=' +
    encodeURIComponent(
      'Bonjour ChapCam, je rencontre un problème pour utiliser le logiciel et j’ai besoin d’aide.',
    )

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 24px; border: 1px solid rgba(0, 255, 136, 0.3); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(90deg, #00ff88, #00d4ff); padding: 22px; text-align: center;">
              <h1 style="margin: 0; color: #001b12; font-size: 24px; font-weight: 800;">Besoin d'aide avec ChapCam ?</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 38px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 18px;">Salut ${userName || 'toi'},</p>

              <h2 style="color: #ffffff; font-size: 24px; line-height: 1.3; font-weight: 800; margin: 0 0 16px;">
                Rencontres-tu un <span style="color: #00ff88;">problème</span> pour utiliser le logiciel ?
              </h2>

              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                On veut s'assurer que tu profites pleinement de ChapCam. Si tu bloques quelque part
                (installation, face swap, camera virtuelle, connexion...), notre équipe est là pour
                t'aider <strong style="color:#ffffff;">en direct</strong>.
              </p>

              <!-- CTA WhatsApp -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 4px 0 12px;">
                    <a href="${WHATSAPP_URL}" style="display: inline-block; width: 80%; background: linear-gradient(90deg, #25D366, #128C7E); color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 24px; border-radius: 12px; text-align: center;">
                      Nous écrire sur WhatsApp
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 0 4px;">
                    <a href="tel:+2250555560189" style="display: inline-block; width: 80%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #ffffff; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 24px; border-radius: 12px; text-align: center;">
                      Nous appeler : +225 05 55 56 01 89
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 13px; text-align: center; margin: 18px 0 0;">
                Réponse rapide du lundi au dimanche. On règle ton problème ensemble.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 38px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                Tu recois cet email car tu es inscrit sur ChapCam.<br>
                <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  return { subject, html }
}

// Template email pour la campagne "ChapCam 2.0" (nouveau moteur IA, base sur
// Decart AI 2.5). Message cle : plus besoin de PC gamer / GPU dedie, ca tourne
// sur tout type de PC. Sorti le 17 juillet. CTA vers les recharges + WhatsApp.
function getChapCam2Email(userName: string) {
  const subject = 'ChapCam 2.0 est disponible - fonctionne desormais sur TOUT type de PC'
  const WHATSAPP_URL =
    'https://wa.me/2250555560189?text=' +
    encodeURIComponent('Bonjour ChapCam, je veux tester la nouvelle version ChapCam 2.0.')

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0e1a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #1a1a2e 0%, #0f0f1a 100%); border-radius: 24px; border: 1px solid rgba(0, 255, 136, 0.3); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(90deg, #7c3aed, #2563eb, #00ff88); padding: 22px; text-align: center;">
              <p style="margin: 0 0 4px; color: rgba(255,255,255,0.85); font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Nouvelle version - 17 juillet</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">ChapCam 2.0 est la</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 38px;">
              <p style="color: #ffffff; font-size: 18px; margin: 0 0 18px;">Salut ${userName || 'toi'},</p>

              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                On vient de sortir <strong style="color: #ffffff;">ChapCam 2.0</strong>, notre nouveau moteur IA
                bien plus rapide et realiste. Le plus gros changement :
                <strong style="color: #00ff88;">plus besoin d'un PC Gamer ni d'une carte graphique dediee</strong>.
              </p>

              <!-- Highlight Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.35); border-radius: 16px; margin: 0 0 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="color: #00ff88; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">Ce qui change avec la 2.0</p>
                    <p style="color: #ffffff; font-size: 15px; margin: 6px 0;">&#10003; Fonctionne sur <strong>tout type de PC</strong> (plus besoin de PC Gamer)</p>
                    <p style="color: #ffffff; font-size: 15px; margin: 6px 0;">&#10003; Transformation du <strong>visage et du corps entier</strong></p>
                    <p style="color: #ffffff; font-size: 15px; margin: 6px 0;">&#10003; Change meme la <strong>couleur de peau</strong></p>
                    <p style="color: #ffffff; font-size: 15px; margin: 6px 0;">&#10003; Qualite superieure et faible latence en direct</p>
                    <p style="color: #ffffff; font-size: 15px; margin: 6px 0;">&#10003; Compatible WhatsApp, Zoom, Discord, TikTok Live</p>
                  </td>
                </tr>
              </table>

              <p style="color: #a0a0a0; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
                Recharge tes points et teste ChapCam 2.0 des maintenant.
              </p>

              <!-- CTA principal -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 22px 0 10px;">
                    <a href="https://chapcam.com/dashboard/plans" style="display: inline-block; background: linear-gradient(90deg, #00ff88, #00d4ff); color: #000000; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 44px; border-radius: 12px;">
                      Tester ChapCam 2.0
                    </a>
                  </td>
                </tr>
                <!-- CTA WhatsApp -->
                <tr>
                  <td align="center" style="padding: 4px 0 0;">
                    <a href="${WHATSAPP_URL}" style="display: inline-block; background: rgba(37, 211, 102, 0.15); border: 1px solid rgba(37, 211, 102, 0.5); color: #25D366; font-size: 15px; font-weight: bold; text-decoration: none; padding: 14px 36px; border-radius: 12px;">
                      Une question ? Ecris-nous sur WhatsApp
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #888888; font-size: 13px; text-align: center; margin: 18px 0 0;">
                Support WhatsApp : <strong style="color:#e5e5e5;">+225 05 55 56 01 89</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 38px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
                Tu recois cet email car tu es inscrit sur ChapCam.<br>
                <a href="https://chapcam.com" style="color: #00ff88;">chapcam.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  return { subject, html }
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
    const { type } = body // 'D2', 'D1', 'DJ', 'PC', 'VIDEO', 'SUPPORT' ou 'V2'

    if (!type || !['D2', 'D1', 'DJ', 'PC', 'VIDEO', 'SUPPORT', 'V2'].includes(type)) {
      return NextResponse.json({ error: 'Type invalide. Utilise D2, D1, DJ, PC, VIDEO, SUPPORT ou V2' }, { status: 400 })
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
          const { subject, html } =
            type === 'PC'
              ? getPcLifetimeEmail(user.name || '')
              : type === 'VIDEO'
                ? getVideoCallEmail(user.name || '')
                : type === 'SUPPORT'
                  ? getSupportEmail(user.name || '')
                  : type === 'V2'
                    ? getChapCam2Email(user.name || '')
                    : getLaunchReminderEmail(user.name || '', type as 'D2' | 'D1' | 'DJ')
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
