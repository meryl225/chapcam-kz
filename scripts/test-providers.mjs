// Test rapide de connectivité des 3 fournisseurs + taux de change.
const FIVESIM = process.env.FIVESIM_API_KEY
const SMSMAN = process.env.SMSMAN_API_TOKEN
const SMSPOOL = process.env.SMSPOOL_API_KEY

async function j(label, p) {
  try {
    const r = await p
    console.log(`\n=== ${label} (HTTP ${r.status}) ===`)
    const t = await r.text()
    console.log(t.slice(0, 400))
  } catch (e) {
    console.log(`\n=== ${label} ERROR: ${e.message} ===`)
  }
}

// Taux de change
await j('FX USD->XOF', fetch('https://open.er-api.com/v6/latest/USD'))

// 5sim — balance + prix WhatsApp USA
await j('5sim profile', fetch('https://5sim.net/v1/user/profile', {
  headers: { Authorization: `Bearer ${FIVESIM}`, Accept: 'application/json' },
}))
await j('5sim prices usa/whatsapp', fetch('https://5sim.net/v1/guest/prices?country=usa&product=whatsapp', {
  headers: { Accept: 'application/json' },
}))

// sms-man — countries + applications + limits
await j('sms-man countries', fetch(`https://api.sms-man.com/control/countries?token=${SMSMAN}`))
await j('sms-man applications', fetch(`https://api.sms-man.com/control/applications?token=${SMSMAN}`))
await j('sms-man balance', fetch(`https://api.sms-man.com/control/get-balance?token=${SMSMAN}`))

// smspool — countries + balance + price
const fd = new FormData()
fd.append('key', SMSPOOL)
await j('smspool balance', fetch('https://api.smspool.net/request/balance', { method: 'POST', body: fd }))
const fd2 = new FormData()
fd2.append('key', SMSPOOL)
await j('smspool countries', fetch('https://api.smspool.net/country/retrieve_all', { method: 'POST', body: fd2 }))
