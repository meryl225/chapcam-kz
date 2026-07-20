// -----------------------------------------------------------------------------
// Envoi d'emails via l'API HTTP transactionnelle de Brevo.
//
// ChapCam n'utilise plus l'API Resend (compte suspendu). On passe par Brevo via
// son API HTTP (https://api.brevo.com/v3/smtp/email) plutot que par le SMTP :
//   - le SMTP (ports 587/465) est souvent bloque ou peu fiable sur les
//     plateformes serverless comme Vercel ;
//   - l'API HTTP passe par le port 443, toujours disponible, et est la methode
//     recommandee par Brevo pour ce type d'hebergement.
//
// Variable requise :
//   BREVO_API_KEY   cle API Brevo (format "xkeysib-...")
//                   -> Brevo > SMTP & API > onglet "API Keys" > "Generate a new API key"
//
// Variable optionnelle :
//   EMAIL_FROM      ex: "ChapCam <contact@chapcam.com>"
//
// IMPORTANT : l'adresse d'envoi doit appartenir a un expediteur / domaine
// VERIFIE chez Brevo. Ici seul contact@chapcam.com est verifie (DKIM valide) ;
// l'ancienne adresse noreply@chapcam.com n'est PAS verifiee et serait rejetee,
// donc on l'ignore et on retombe sur l'adresse verifiee.
//
// L'adaptateur ci-dessous expose la MEME interface que le client Resend
// (`client.emails.send(...)` et `client.batch.send(...)`), afin que toutes les
// fonctions d'envoi existantes continuent de fonctionner sans modification.
// -----------------------------------------------------------------------------
let brevoClient: any = null

const VERIFIED_FROM = 'ChapCam <contact@chapcam.com>'
const FROM_EMAIL =
  process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('noreply@chapcam.com')
    ? process.env.EMAIL_FROM
    : VERIFIED_FROM

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email'

type SendPayload = {
  from?: string
  to: string | string[]
  subject: string
  html: string
  replyTo?: string
}

// Transforme "ChapCam <contact@chapcam.com>" en { name, email }.
function parseAddress(input: string): { name?: string; email: string } {
  const match = input.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (match) {
    return { name: match[1] || undefined, email: match[2].trim() }
  }
  return { email: input.trim() }
}

async function getResendClient() {
  if (brevoClient) return brevoClient

  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    console.warn('[Email] BREVO_API_KEY manquant - envoi desactive')
    return null
  }

  const sendOne = async (msg: SendPayload): Promise<string | undefined> => {
    const sender = parseAddress(msg.from || FROM_EMAIL)
    const recipients = (Array.isArray(msg.to) ? msg.to : [msg.to]).map((email) => ({ email }))

    const body: Record<string, any> = {
      sender,
      to: recipients,
      subject: msg.subject,
      htmlContent: msg.html,
    }
    if (msg.replyTo) body.replyTo = parseAddress(msg.replyTo)

    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Brevo API ${res.status}: ${detail.slice(0, 200)}`)
    }
    const data = await res.json().catch(() => ({}))
    return data?.messageId as string | undefined
  }

  // Interface compatible Resend
  brevoClient = {
    emails: {
      send: async (msg: SendPayload) => {
        try {
          const id = await sendOne(msg)
          return { data: { id }, error: null }
        } catch (error: any) {
          console.error('[Email] Echec envoi Brevo:', error?.message || error)
          return { data: null, error: error?.message || error }
        }
      },
    },
    batch: {
      // Resend.batch.send accepte un tableau de messages ; on les envoie
      // sequentiellement via l'API HTTP et on renvoie la liste des ids.
      send: async (messages: SendPayload[]) => {
        try {
          const data: Array<{ id: string | undefined }> = []
          for (const msg of messages) {
            const id = await sendOne(msg)
            data.push({ id })
          }
          return { data, error: null }
        } catch (error: any) {
          console.error('[Email] Echec envoi batch Brevo:', error?.message || error)
          return { data: null, error: error?.message || error }
        }
      },
    },
  }

  return brevoClient
}

// Template email de bienvenue / confirmation d'inscription
export async function sendWelcomeEmail(to: string, userName: string) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }
  
  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Bienvenue sur ChapCam - Votre compte est pret!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
              <td style="text-align: center; padding-bottom: 30px;">
                <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius: 16px;">
              </td>
            </tr>
            <tr>
              <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 40px; border: 1px solid #222;">
                <h1 style="color: #00ff88; margin: 0 0 20px 0; font-size: 28px; text-align: center;">Bienvenue sur ChapCam!</h1>
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Bonjour <strong>${userName}</strong>,
                </p>
                <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Votre compte ChapCam a ete cree avec succes! Vous pouvez maintenant profiter de notre technologie de transformation faciale en temps reel.
                </p>
                <div style="background: #00ff8815; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <p style="color: #00ff88; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">Ce que vous pouvez faire:</p>
                  <ul style="color: #cccccc; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Transformer votre visage en temps reel</li>
                    <li>Utiliser ChapCam avec WhatsApp, Zoom, Teams</li>
                    <li>Creer des avatars personnalises</li>
                  </ul>
                </div>
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://chapcam.com/dashboard" style="display: inline-block; background: #00ff88; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Acceder a mon compte
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 30px;">
                <p style="color: #666666; font-size: 12px; margin: 0;">
                  ChapCam - Face Swap en Temps Reel<br>
                  <a href="https://chapcam.com" style="color: #00ff88; text-decoration: none;">chapcam.com</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending welcome email:', error)
      return { success: false, error }
    }

    console.log('[Email] Welcome email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending welcome email:', error)
    return { success: false, error }
  }
}

// Signalement d'abus -> envoye au contact juridique
export async function sendAbuseReportEmail(report: {
  name: string
  email: string
  contentUrl?: string
  reason: string
  description: string
  ip?: string
}) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping abuse report email')
    return { success: false, error: 'Email service not configured' }
  }

  const esc = (v: string) =>
    v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: ['contact@chapcam.com'],
      replyTo: report.email,
      subject: `Signalement d'abus — ${report.reason}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #ffffff;">
          <h2 style="color: #00ff88; margin: 0 0 16px;">Nouveau signalement d'abus</h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #9aa3b2; width: 160px;">Nom</td><td style="padding: 8px 0;">${esc(report.name)}</td></tr>
            <tr><td style="padding: 8px 0; color: #9aa3b2;">Email</td><td style="padding: 8px 0;">${esc(report.email)}</td></tr>
            <tr><td style="padding: 8px 0; color: #9aa3b2;">Motif</td><td style="padding: 8px 0;">${esc(report.reason)}</td></tr>
            <tr><td style="padding: 8px 0; color: #9aa3b2;">Lien du contenu</td><td style="padding: 8px 0;">${report.contentUrl ? esc(report.contentUrl) : '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #9aa3b2;">Adresse IP</td><td style="padding: 8px 0;">${report.ip ? esc(report.ip) : '—'}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #111111; border: 1px solid #242424; border-radius: 12px;">
            <p style="color: #9aa3b2; margin: 0 0 8px; font-size: 13px;">Description</p>
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${esc(report.description)}</p>
          </div>
          <p style="margin-top: 16px; color: #666; font-size: 12px;">Reçu le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Error sending abuse report:', error)
      return { success: false, error }
    }

    console.log('[Email] Abuse report sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending abuse report:', error)
    return { success: false, error }
  }
}

// Alerte admin : une licence ChapCam PC est suspectee d'etre partagee.
export async function sendLicenseSharingAlertEmail(info: {
  licenseKey: string
  email?: string | null
  distinctMachines: number
  windowDays: number
}) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Email non configure - alerte partage ignoree')
    return { success: false, error: 'Email service not configured' }
  }

  const esc = (v: string) =>
    String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: ['fanny.guck@gmail.com'],
      subject: `Alerte : licence PC partagee — ${info.licenseKey}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #0a0a0a; color: #ffffff;">
          <h2 style="color: #ff5555; margin: 0 0 16px;">Licence PC suspectee de partage</h2>
          <p style="color: #cccccc; font-size: 14px; line-height: 1.6;">
            La licence ci-dessous a ete utilisee sur <strong>${info.distinctMachines} PC differents</strong>
            en ${info.windowDays} jours. Elle a ete <strong>automatiquement suspendue</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #9aa3b2; width: 160px;">Cle de licence</td><td style="padding: 8px 0;"><code>${esc(info.licenseKey)}</code></td></tr>
            <tr><td style="padding: 8px 0; color: #9aa3b2;">Client (email)</td><td style="padding: 8px 0;">${info.email ? esc(info.email) : '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #9aa3b2;">Machines distinctes</td><td style="padding: 8px 0;">${info.distinctMachines}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 16px; background: #111111; border: 1px solid #242424; border-radius: 12px;">
            <p style="color: #9aa3b2; margin: 0; font-size: 13px; line-height: 1.6;">
              Pour reactiver cette licence (si le client est legitime), repassez son statut a
              <strong>active</strong> dans l'admin des licences PC.
            </p>
          </div>
          <p style="margin-top: 16px; color: #666; font-size: 12px;">Detecte le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Erreur envoi alerte partage:', error)
      return { success: false, error }
    }
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception envoi alerte partage:', error)
    return { success: false, error }
  }
}

// Template email de reinitialisation de mot de passe
export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }
  
  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'ChapCam - Reinitialisation de votre mot de passe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
              <td style="text-align: center; padding-bottom: 30px;">
                <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius: 16px;">
              </td>
            </tr>
            <tr>
              <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 40px; border: 1px solid #222;">
                <h1 style="color: #00ff88; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Reinitialisation du mot de passe</h1>
                <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Vous avez demande la reinitialisation de votre mot de passe ChapCam. Cliquez sur le bouton ci-dessous pour creer un nouveau mot de passe.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="display: inline-block; background: #00ff88; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Reinitialiser mon mot de passe
                  </a>
                </div>
                <div style="background: #ff660015; border-radius: 12px; padding: 16px; margin-top: 20px;">
                  <p style="color: #ff9966; font-size: 13px; margin: 0;">
                    <strong>Important:</strong> Ce lien expire dans 1 heure. Si vous n'avez pas demande cette reinitialisation, ignorez cet email.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 30px;">
                <p style="color: #666666; font-size: 12px; margin: 0;">
                  ChapCam - Face Swap en Temps Reel<br>
                  <a href="https://chapcam.com" style="color: #00ff88; text-decoration: none;">chapcam.com</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending reset email:', error)
      return { success: false, error }
    }

    console.log('[Email] Reset email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending reset email:', error)
    return { success: false, error }
  }
}

// Template email de confirmation de paiement
export async function sendPaymentConfirmationEmail(
  to: string,
  userName: string,
  plan: string,
  amount: number,
  points: number,
  duration: string,
  transactionId: string
) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }
  
  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `ChapCam - Confirmation de paiement - Plan ${plan}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <tr>
              <td style="text-align: center; padding-bottom: 30px;">
                <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius: 16px;">
              </td>
            </tr>
            <tr>
              <td style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); border-radius: 16px; padding: 40px; border: 1px solid #222;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="display: inline-block; background: #00ff8820; border-radius: 50%; padding: 16px;">
                    <span style="font-size: 32px;">&#10003;</span>
                  </div>
                </div>
                <h1 style="color: #00ff88; margin: 0 0 20px 0; font-size: 24px; text-align: center;">Paiement confirme!</h1>
                <p style="color: #ffffff; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Bonjour <strong>${userName}</strong>,
                </p>
                <p style="color: #cccccc; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                  Votre paiement a ete recu et traite avec succes. Vos points ont ete credites sur votre compte.
                </p>
                
                <div style="background: #111111; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #333;">
                  <h3 style="color: #00ff88; margin: 0 0 16px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Details de la commande</h3>
                  <table width="100%" cellspacing="0" cellpadding="8">
                    <tr>
                      <td style="color: #888888; font-size: 14px; border-bottom: 1px solid #222;">Plan</td>
                      <td style="color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222; font-weight: bold;">${plan}</td>
                    </tr>
                    <tr>
                      <td style="color: #888888; font-size: 14px; border-bottom: 1px solid #222;">Montant</td>
                      <td style="color: #00ff88; font-size: 14px; text-align: right; border-bottom: 1px solid #222; font-weight: bold;">${amount.toLocaleString()} FCFA</td>
                    </tr>
                    <tr>
                      <td style="color: #888888; font-size: 14px; border-bottom: 1px solid #222;">Points credites</td>
                      <td style="color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222; font-weight: bold;">${points.toLocaleString()} pts</td>
                    </tr>
                    <tr>
                      <td style="color: #888888; font-size: 14px; border-bottom: 1px solid #222;">Duree</td>
                      <td style="color: #ffffff; font-size: 14px; text-align: right; border-bottom: 1px solid #222;">${duration}</td>
                    </tr>
                    <tr>
                      <td style="color: #888888; font-size: 14px;">Transaction ID</td>
                      <td style="color: #666666; font-size: 12px; text-align: right; font-family: monospace;">${transactionId}</td>
                    </tr>
                  </table>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://chapcam.com/dashboard" style="display: inline-block; background: #00ff88; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Commencer a utiliser mes points
                  </a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="text-align: center; padding-top: 30px;">
                <p style="color: #666666; font-size: 12px; margin: 0 0 10px 0;">
                  Besoin d'aide? Contactez-nous sur WhatsApp: +225 05 55 56 01 89
                </p>
                <p style="color: #666666; font-size: 12px; margin: 0;">
                  ChapCam - Face Swap en Temps Reel<br>
                  <a href="https://chapcam.com" style="color: #00ff88; text-decoration: none;">chapcam.com</a>
                </p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending payment confirmation:', error)
      return { success: false, error }
    }

    console.log('[Email] Payment confirmation sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending payment confirmation:', error)
    return { success: false, error }
  }
}

// Template email d'abonnement approuve
export async function sendSubscriptionApprovedEmail(
  to: string,
  userName: string,
  plan: string,
  amount: number,
  points: number,
  startDate: string,
  endDate: string,
) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `ChapCam - Votre abonnement ${plan} est active !`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <tr><td style="text-align:center;padding-bottom:30px;">
              <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius:16px;">
            </td></tr>
            <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#0d0d0d 100%);border-radius:16px;padding:40px;border:1px solid #222;">
              <div style="text-align:center;margin-bottom:20px;">
                <div style="display:inline-block;background:#00ff8820;border-radius:50%;padding:16px;"><span style="font-size:32px;">&#10003;</span></div>
              </div>
              <h1 style="color:#00ff88;margin:0 0 20px 0;font-size:24px;text-align:center;">Abonnement active !</h1>
              <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Bonjour <strong>${userName}</strong>,</p>
              <p style="color:#cccccc;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
                Votre paiement a ete verifie et votre abonnement est maintenant actif. Vos points ont ete credites sur votre compte.
              </p>
              <div style="background:#111111;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #333;">
                <table width="100%" cellspacing="0" cellpadding="8">
                  <tr><td style="color:#888;font-size:14px;border-bottom:1px solid #222;">Formule</td><td style="color:#fff;font-size:14px;text-align:right;border-bottom:1px solid #222;font-weight:bold;">${plan}</td></tr>
                  <tr><td style="color:#888;font-size:14px;border-bottom:1px solid #222;">Montant</td><td style="color:#00ff88;font-size:14px;text-align:right;border-bottom:1px solid #222;font-weight:bold;">${amount.toLocaleString()} FCFA</td></tr>
                  <tr><td style="color:#888;font-size:14px;border-bottom:1px solid #222;">Points credites</td><td style="color:#fff;font-size:14px;text-align:right;border-bottom:1px solid #222;font-weight:bold;">${points.toLocaleString()} pts</td></tr>
                  <tr><td style="color:#888;font-size:14px;border-bottom:1px solid #222;">Debut</td><td style="color:#fff;font-size:14px;text-align:right;border-bottom:1px solid #222;">${startDate}</td></tr>
                  <tr><td style="color:#888;font-size:14px;">Expiration</td><td style="color:#fff;font-size:14px;text-align:right;">${endDate}</td></tr>
                </table>
              </div>
              <div style="text-align:center;margin-top:30px;">
                <a href="https://chapcam.com/dashboard" style="display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">Acceder a mon compte</a>
              </div>
            </td></tr>
            <tr><td style="text-align:center;padding-top:30px;">
              <p style="color:#666;font-size:12px;margin:0;">ChapCam - Face Swap en Temps Reel<br><a href="https://chapcam.com" style="color:#00ff88;text-decoration:none;">chapcam.com</a></p>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending approval email:', error)
      return { success: false, error }
    }
    console.log('[Email] Subscription approved email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending approval email:', error)
    return { success: false, error }
  }
}

// Template email d'abonnement refuse
export async function sendSubscriptionRejectedEmail(
  to: string,
  userName: string,
  plan: string,
  reason?: string,
) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `ChapCam - Probleme avec votre paiement ${plan}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <tr><td style="text-align:center;padding-bottom:30px;">
              <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius:16px;">
            </td></tr>
            <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#0d0d0d 100%);border-radius:16px;padding:40px;border:1px solid #222;">
              <h1 style="color:#ff6b6b;margin:0 0 20px 0;font-size:22px;text-align:center;">Paiement non valide</h1>
              <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Bonjour <strong>${userName}</strong>,</p>
              <p style="color:#cccccc;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
                Nous n'avons pas pu valider votre paiement pour la formule <strong>${plan}</strong>.
                ${reason ? `<br><br><span style="color:#ff9966;">Motif : ${reason}</span>` : ''}
              </p>
              <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                Si vous pensez qu'il s'agit d'une erreur, contactez-nous sur WhatsApp : +225 05 55 56 01 89 avec votre reference de transaction.
              </p>
              <div style="text-align:center;margin-top:30px;">
                <a href="https://chapcam.com/dashboard/plans" style="display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">Reessayer</a>
              </div>
            </td></tr>
            <tr><td style="text-align:center;padding-top:30px;">
              <p style="color:#666;font-size:12px;margin:0;">ChapCam - Face Swap en Temps Reel<br><a href="https://chapcam.com" style="color:#00ff88;text-decoration:none;">chapcam.com</a></p>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending rejection email:', error)
      return { success: false, error }
    }
    console.log('[Email] Subscription rejected email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending rejection email:', error)
    return { success: false, error }
  }
}

// Template email : acces Live Pro active (offre fenetre 15 min)
export async function sendLiveAccessApprovedEmail(
  to: string,
  userName: string,
  offerName: string,
  amount: number,
  windowMinutes: number,
) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `ChapCam - Votre acces ${offerName} est active !`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <tr><td style="text-align:center;padding-bottom:30px;">
              <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius:16px;">
            </td></tr>
            <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#0d0d0d 100%);border-radius:16px;padding:40px;border:1px solid #222;">
              <div style="text-align:center;margin-bottom:20px;">
                <div style="display:inline-block;background:#00ff8820;border-radius:50%;padding:16px;"><span style="font-size:32px;">&#10003;</span></div>
              </div>
              <h1 style="color:#00ff88;margin:0 0 20px 0;font-size:24px;text-align:center;">Acces Live Pro active !</h1>
              <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Bonjour <strong>${userName}</strong>,</p>
              <p style="color:#cccccc;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
                Votre paiement a ete verifie. Votre acces au Face Swap temps reel est pret.
                La fenetre de <strong>${windowMinutes} minutes</strong> demarrera au moment ou vous lancerez votre premiere session sur la page Live.
              </p>
              <div style="background:#111111;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #333;">
                <table width="100%" cellspacing="0" cellpadding="8">
                  <tr><td style="color:#888;font-size:14px;border-bottom:1px solid #222;">Offre</td><td style="color:#fff;font-size:14px;text-align:right;border-bottom:1px solid #222;font-weight:bold;">${offerName}</td></tr>
                  <tr><td style="color:#888;font-size:14px;border-bottom:1px solid #222;">Montant</td><td style="color:#00ff88;font-size:14px;text-align:right;border-bottom:1px solid #222;font-weight:bold;">${amount.toLocaleString()} FCFA</td></tr>
                  <tr><td style="color:#888;font-size:14px;">Duree d'acces</td><td style="color:#fff;font-size:14px;text-align:right;font-weight:bold;">${windowMinutes} min (au lancement)</td></tr>
                </table>
              </div>
              <div style="text-align:center;margin-top:30px;">
                <a href="https://chapcam.com/live" style="display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">Lancer le Live</a>
              </div>
            </td></tr>
            <tr><td style="text-align:center;padding-top:30px;">
              <p style="color:#666;font-size:12px;margin:0;">ChapCam - Face Swap en Temps Reel<br><a href="https://chapcam.com" style="color:#00ff88;text-decoration:none;">chapcam.com</a></p>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending live access email:', error)
      return { success: false, error }
    }
    console.log('[Email] Live access approved email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending live access email:', error)
    return { success: false, error }
  }
}

// Template email : frais d'installation regles, equipe prendra contact
export async function sendInstallationPaidEmail(to: string, userName: string, amount: number) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'ChapCam - Vos frais d\'installation sont confirmes',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <tr><td style="text-align:center;padding-bottom:30px;">
              <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius:16px;">
            </td></tr>
            <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#0d0d0d 100%);border-radius:16px;padding:40px;border:1px solid #222;">
              <div style="text-align:center;margin-bottom:20px;">
                <div style="display:inline-block;background:#00ff8820;border-radius:50%;padding:16px;"><span style="font-size:32px;">&#10003;</span></div>
              </div>
              <h1 style="color:#00ff88;margin:0 0 20px 0;font-size:24px;text-align:center;">Frais d'installation confirmes !</h1>
              <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Bonjour <strong>${userName}</strong>,</p>
              <p style="color:#cccccc;font-size:16px;line-height:1.6;margin:0 0 20px 0;">
                Nous avons bien recu le paiement de vos frais d'installation. Un membre de l'equipe ChapCam va vous contacter tres prochainement
                pour fixer un rendez-vous et proceder a l'installation complete (logiciel, configuration de votre compte, WhatsApp et autres plateformes).
              </p>
              <div style="background:#111111;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #333;">
                <table width="100%" cellspacing="0" cellpadding="8">
                  <tr><td style="color:#888;font-size:14px;border-bottom:1px solid #222;">Prestation</td><td style="color:#fff;font-size:14px;text-align:right;border-bottom:1px solid #222;font-weight:bold;">Installation complete a domicile</td></tr>
                  <tr><td style="color:#888;font-size:14px;">Montant regle</td><td style="color:#00ff88;font-size:14px;text-align:right;font-weight:bold;">${amount.toLocaleString()} FCFA</td></tr>
                </table>
              </div>
              <p style="color:#cccccc;font-size:14px;line-height:1.6;margin:0 0 20px 0;">
                Rappel : l'installation necessite un abonnement ChapCam actif pour utiliser le service.
                Les demandes sont traitees par ordre de paiement et selon les disponibilites de notre equipe.
              </p>
              <div style="text-align:center;margin-top:30px;">
                <a href="https://chapcam.com/dashboard/mes-demandes" style="display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">Voir mes demandes</a>
              </div>
            </td></tr>
            <tr><td style="text-align:center;padding-top:30px;">
              <p style="color:#666;font-size:12px;margin:0;">ChapCam - Face Swap en Temps Reel<br><a href="https://chapcam.com" style="color:#00ff88;text-decoration:none;">chapcam.com</a></p>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending installation paid email:', error)
      return { success: false, error }
    }
    console.log('[Email] Installation paid email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending installation paid email:', error)
    return { success: false, error }
  }
}

// Email envoye apres l'achat de ChapCam PC : contient la cle de licence a vie
// + les liens de telechargement du logiciel (Windows et MacBook).
export async function sendPcLicenseEmail(
  to: string,
  userName: string,
  licenseKey: string,
  downloadUrl: string,
  amount: number,
  macDownloadUrl?: string,
) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'ChapCam PC - Ta cle de licence + telechargement',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
        <body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <tr><td style="text-align:center;padding-bottom:30px;">
              <img src="https://chapcam.com/favicon.jpg" alt="ChapCam" width="80" height="80" style="border-radius:16px;">
            </td></tr>
            <tr><td style="background:linear-gradient(135deg,#1a1a1a 0%,#0d0d0d 100%);border-radius:16px;padding:40px;border:1px solid #222;">
              <div style="text-align:center;margin-bottom:20px;">
                <div style="display:inline-block;background:#00ff8820;border-radius:50%;padding:16px;"><span style="font-size:32px;">&#127942;</span></div>
              </div>
              <h1 style="color:#00ff88;margin:0 0 20px 0;font-size:24px;text-align:center;">Bienvenue sur ChapCam PC !</h1>
              <p style="color:#ffffff;font-size:16px;line-height:1.6;margin:0 0 20px 0;">Bonjour <strong>${userName}</strong>,</p>
              <p style="color:#cccccc;font-size:16px;line-height:1.6;margin:0 0 24px 0;">
                Merci pour ton achat ! Voici ta cle de licence <strong>a vie</strong>. Garde-la precieusement :
                elle te servira a activer le logiciel sur ton PC.
              </p>

              <!-- Cle de licence -->
              <div style="background:#000000;border:1px solid #00ff8855;border-radius:12px;padding:20px;margin:0 0 24px 0;text-align:center;">
                <p style="color:#888;font-size:12px;margin:0 0 8px 0;text-transform:uppercase;letter-spacing:1px;">Ta cle de licence</p>
                <p style="color:#00ff88;font-size:22px;font-weight:bold;font-family:'Courier New',monospace;letter-spacing:2px;margin:0;">${licenseKey}</p>
              </div>

              <!-- Telechargement -->
              <div style="text-align:center;margin:0 0 24px 0;">
                <a href="${downloadUrl}" style="display:inline-block;background:#00ff88;color:#000;text-decoration:none;padding:16px 36px;border-radius:8px;font-weight:bold;font-size:16px;">Telecharger pour Windows</a>
                ${
                  macDownloadUrl
                    ? `<div style="margin-top:12px;"><a href="${macDownloadUrl}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:15px;border:1px solid #444;">Telecharger pour MacBook</a></div>`
                    : ''
                }
              </div>

              <!-- Etapes -->
              <div style="background:#111111;border-radius:12px;padding:20px;margin:0 0 20px 0;border:1px solid #333;">
                <p style="color:#fff;font-size:14px;font-weight:bold;margin:0 0 12px 0;">Comment installer :</p>
                <ol style="color:#cccccc;font-size:14px;line-height:1.8;margin:0;padding-left:20px;">
                  <li>Telecharge et installe ChapCam PC (Windows ou MacBook).</li>
                  <li>Lance le logiciel et colle ta cle de licence.</li>
                  <li>Choisis un visage, active la camera virtuelle et c'est parti !</li>
                </ol>
              </div>

              <div style="background:#111111;border-radius:12px;padding:16px;margin:0 0 20px 0;border:1px solid #333;">
                <table width="100%" cellspacing="0" cellpadding="6">
                  <tr><td style="color:#888;font-size:14px;">Produit</td><td style="color:#fff;font-size:14px;text-align:right;font-weight:bold;">ChapCam PC — Logiciel a vie</td></tr>
                  <tr><td style="color:#888;font-size:14px;">Montant regle</td><td style="color:#00ff88;font-size:14px;text-align:right;font-weight:bold;">${amount.toLocaleString()} FCFA</td></tr>
                  <tr><td style="color:#888;font-size:14px;">Licence</td><td style="color:#fff;font-size:14px;text-align:right;">A vie, 1 PC</td></tr>
                </table>
              </div>

              <p style="color:#888;font-size:13px;line-height:1.6;margin:0;">
                La cle s'active sur un seul PC. Pour changer de machine, contacte le support.
              </p>
            </td></tr>
            <tr><td style="text-align:center;padding-top:30px;">
              <p style="color:#666;font-size:12px;margin:0;">ChapCam - Face Swap en Temps Reel<br><a href="https://chapcam.com" style="color:#00ff88;text-decoration:none;">chapcam.com</a></p>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('[Email] Error sending PC license email:', error)
      return { success: false, error }
    }
    console.log('[Email] PC license email sent:', data?.id)
    return { success: true, id: data?.id }
  } catch (error) {
    console.error('[Email] Exception sending PC license email:', error)
    return { success: false, error }
  }
}

// Envoi d'emails en batch pour les gros volumes (newsletters, etc.)
export async function sendBatchEmails(
  emails: Array<{
    to: string
    subject: string
    html: string
  }>
) {
  const client = await getResendClient()
  if (!client) {
    console.warn('[Email] Resend not configured - skipping batch emails')
    return [{ batch: 0, success: false, error: 'Email service not configured' }]
  }
  
  // Resend supporte jusqu'a 100 emails par batch
  const BATCH_SIZE = 100
  const results = []

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE)
    
    try {
      const { data, error } = await client.batch.send(
        batch.map((email) => ({
          from: FROM_EMAIL,
          to: [email.to],
          subject: email.subject,
          html: email.html,
        }))
      )

      if (error) {
        console.error(`[Email] Batch ${i / BATCH_SIZE + 1} error:`, error)
        results.push({ batch: i / BATCH_SIZE + 1, success: false, error })
      } else {
        console.log(`[Email] Batch ${i / BATCH_SIZE + 1} sent:`, data)
        results.push({ batch: i / BATCH_SIZE + 1, success: true, data })
      }
    } catch (error) {
      console.error(`[Email] Batch ${i / BATCH_SIZE + 1} exception:`, error)
      results.push({ batch: i / BATCH_SIZE + 1, success: false, error })
    }

    // Petit delai entre les batches pour eviter le rate limiting
    if (i + BATCH_SIZE < emails.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return results
}
