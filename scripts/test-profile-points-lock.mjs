// Verifie le correctif 2026-10-31-lock-profile-financial-columns.sql sur Supabase.
// Cree 2 comptes jetables (@chapcam-audit.invalid), les attaque, puis les supprime.
// Usage : node --env-file=/vercel/share/.env.project scripts/test-profile-points-lock.mjs
const U = process.env.SUPABASE_URL
const S = process.env.SUPABASE_SERVICE_ROLE_KEY
const A = process.env.SUPABASE_ANON_KEY
const sh = { apikey: S, Authorization: `Bearer ${S}`, 'Content-Type': 'application/json' }
let failures = 0

async function makeUser() {
  const email = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@chapcam-audit.invalid`
  const password = 'Audit-' + Math.random().toString(36).slice(2) + '!9'
  const cu = await (await fetch(`${U}/auth/v1/admin/users`, { method: 'POST', headers: sh, body: JSON.stringify({ email, password, email_confirm: true }) })).json()
  const tk = await (await fetch(`${U}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: A, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })).json()
  return { id: cu.id, email, h: { apikey: A, Authorization: `Bearer ${tk.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' } }
}
function check(label, expectAllowed, allowed) {
  const ok = allowed === expectAllowed
  if (!ok) failures++
  console.log(`${ok ? 'OK  ' : 'FAIL'} | ${label} | ${allowed ? 'AUTORISE' : 'REFUSE'}`)
}
async function patch(h, filter, body) {
  const r = await fetch(`${U}/rest/v1/profiles?${filter}`, { method: 'PATCH', headers: h, body: JSON.stringify(body) })
  const j = await r.json().catch(() => [])
  return r.ok && Array.isArray(j) && j.length > 0
}
const rpc = (h, body) => fetch(`${U}/rest/v1/rpc/adjust_profile_points`, { method: 'POST', headers: h, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => null) }))
const points = async (id) => (await (await fetch(`${U}/rest/v1/profiles?select=points&id=eq.${id}`, { headers: sh })).json())[0]?.points

let a, b
try {
  a = await makeUser()
  b = await makeUser()

  const selfInsert = await fetch(`${U}/rest/v1/profiles`, { method: 'POST', headers: a.h, body: JSON.stringify({ id: a.id, email: a.email, points: 999999, plan: 'vip' }) })
  const inserted = (await selfInsert.json().catch(() => []))?.[0]
  check('INSERT profil avec points=999999 garde ces points', false, selfInsert.ok && inserted?.points === 999999)
  for (const u of [a, b]) {
    await fetch(`${U}/rest/v1/profiles?on_conflict=id`, { method: 'POST', headers: { ...sh, Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: u.id, email: u.email, points: 0, plan: 'free' }) })
  }

  console.log('--- attaques depuis un compte ordinaire')
  check('profiles.points=999999 (soi)', false, await patch(a.h, `id=eq.${a.id}`, { points: 999999 }))
  check('profiles.plan=vip (soi)', false, await patch(a.h, `id=eq.${a.id}`, { plan: 'vip', plan_expires_at: '2099-01-01' }))
  check('rpc adjust_profile_points +1000 (soi)', false, (await rpc(a.h, { p_user_id: a.id, p_delta: 1000 })).ok)
  check("profiles.points d'un autre compte", false, await patch(a.h, `id=eq.${b.id}`, { points: 999999 }))
  check('solde toujours 0 apres attaques', true, (await points(a.id)) === 0)

  console.log('--- usages legitimes')
  check('modifier full_name/avatar_url (soi)', true, await patch(a.h, `id=eq.${a.id}`, { full_name: 'Test Audit', avatar_url: 'https://example.com/a.png' }))
  const own = await (await fetch(`${U}/rest/v1/profiles?select=points&id=eq.${a.id}`, { headers: a.h })).json()
  check('lire son propre solde', true, Array.isArray(own) && own.length === 1)

  console.log('--- serveur (service_role)')
  check('credit serveur +100', true, (await rpc(sh, { p_user_id: a.id, p_delta: 100 })).data === 100)
  const debits = await Promise.all(Array.from({ length: 8 }, () => rpc(sh, { p_user_id: a.id, p_delta: -30 })))
  const applied = debits.filter((d) => d.data !== null).length
  const final = await points(a.id)
  check(`8 debits simultanes de 30 sur 100 -> ${applied} appliques, solde ${final} (attendu 3 / 10)`, true, applied === 3 && final === 10)
} finally {
  for (const u of [a, b].filter(Boolean)) {
    await fetch(`${U}/rest/v1/profiles?id=eq.${u.id}`, { method: 'DELETE', headers: sh })
    const d = await fetch(`${U}/auth/v1/admin/users/${u.id}`, { method: 'DELETE', headers: sh })
    console.log('nettoyage compte test', u.id.slice(0, 8), d.ok)
  }
  console.log(failures ? `\n${failures} ECHEC(S)` : '\nTOUS LES TESTS PASSENT')
  process.exitCode = failures ? 1 : 0
}
