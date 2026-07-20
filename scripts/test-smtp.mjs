import nodemailer from 'nodemailer'

const host = process.env.SMTP_HOST
const port = Number(process.env.SMTP_PORT) || 587
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS

console.log('[test] host=%s port=%s user=%s', host, port, user ? user.slice(0, 6) + '…' : '(none)')

const t = nodemailer.createTransport({
  host,
  port,
  secure: port === 465,
  auth: { user, pass },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
})

try {
  await t.verify()
  console.log('[test] VERIFY OK — Brevo accepte la connexion')
  const info = await t.sendMail({
    from: 'ChapCam <contact@chapcam.com>',
    to: 'meryl.kacou@gmail.com',
    subject: 'Test SMTP ChapCam',
    html: '<p>Test envoi via Brevo SMTP. Si tu reçois ceci, tout fonctionne.</p>',
  })
  console.log('[test] EMAIL ENVOYÉ ✓ messageId =', info.messageId)
} catch (e) {
  console.log('[test] ÉCHEC:', e && e.message)
}
