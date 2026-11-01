import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, verify } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { appleClient, authorizedAudit, createToken, runAudit } from './core.mjs'

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' })
const env = { ASC_KEY_ID: 'test-key', ASC_ISSUER_ID: 'test-issuer', ASC_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }) }
const resource = (id, attributes) => ({ id, attributes })
const respond = (data, links = {}) => Response.json({ data, links })
const fixtures = {
  '/v1/apps/6818781411': resource('6818781411', { bundleId: 'com.chapcam.app' }),
  '/v1/apps/6818781411/appStoreVersions': [resource('version', { versionString: '2.0', platform: 'IOS', appStoreState: 'WAITING_FOR_REVIEW' })],
  '/v1/appStoreVersions/version/build': resource('build', { version: '29', processingState: 'PROCESSING', expired: false }),
  '/v1/appStoreVersions/version/appStoreReviewDetail': resource('review', { demoAccountRequired: true, demoAccountName: 'SECRET-DEMO', demoAccountPassword: 'SECRET-PASSWORD', contactFirstName: 'SECRET-NAME', contactLastName: 'SECRET-LAST', contactEmail: 'SECRET-EMAIL', contactPhone: 'SECRET-PHONE' }),
  '/v1/appStoreVersions/version/appStoreVersionLocalizations': [resource('fr', { locale: 'fr-FR', description: 'SECRET-DESCRIPTION', supportUrl: '' })],
}
const transport = async (url, options) => {
  assert.equal(options.method, 'GET')
  assert.equal(options.redirect, 'error')
  return respond(fixtures[new URL(url).pathname] ?? [])
}
test('JWT uses ES256, valid P1363 signature and ten minute lifetime', () => {
  const token = createToken(env), [header, payload, signature] = token.split('.')
  const h = JSON.parse(Buffer.from(header, 'base64url')), p = JSON.parse(Buffer.from(payload, 'base64url'))
  assert.equal(h.alg, 'ES256'); assert.equal(p.exp - p.iat, 600); assert.equal(p.aud, 'appstoreconnect-v1')
  assert(verify('sha256', Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url')))
})
test('missing configuration never contacts Apple', async () => {
  const report = await runAudit({ transport: () => { throw Error('must not run') } })
  assert.equal(report.missingVariables.length, 3)
  assert.equal(report.target.build, null)
  assert(report.findings.some((f) => f.status === 'Non vérifié'))
})
test('unauthorized admin denied before audit; authorized request succeeds', async () => {
  let runs = 0
  const execute = async () => { runs++; return { findings: [] } }
  assert.equal((await authorizedAudit(async () => false, execute)).status, 403)
  assert.equal(runs, 0)
  const response = await authorizedAudit(async () => true, execute)
  assert.equal(response.status, 200); assert.equal(runs, 1)
  assert.match(response.headers.get('Cache-Control'), /no-store/)
})
test('unexpected errors never expose secrets', async () => {
  const response = await authorizedAudit(async () => true, () => { throw Error('SECRET-PASSWORD') })
  assert.equal(response.status, 500); assert(!(await response.text()).includes('SECRET'))
})
test('actual attached build, missing support and zero screenshots identified', async () => {
  const report = await runAudit({ env, transport })
  assert.equal(report.target.build, '29')
  assert(report.findings.some((f) => f.title === 'Build attaché' && f.status === 'À vérifier'))
  assert(report.findings.some((f) => f.status === 'Manquant' && f.evidence.includes('supportUrl')))
  assert(report.findings.some((f) => f.status === 'Manquant' && f.evidence === 'Aucune capture.'))
})
test('no review values, private keys, JWTs or descriptions in export', async () => {
  const text = JSON.stringify(await runAudit({ env, transport }))
  for (const secret of ['SECRET-', 'PRIVATE KEY', 'test-issuer', 'test-key', 'eyJ']) assert(!text.includes(secret))
})
test('follows pagination and returns every page', async () => {
  let calls = 0
  const client = appleClient('token', async () => ++calls === 1 ? respond([resource('one', {})], { next: '/v1/apps?cursor=2' }) : respond([resource('two', {})]))
  assert.equal((await client('/v1/apps')).length, 2); assert.equal(calls, 2)
})
test('rejects pagination to external hosts before sending token', async () => {
  let calls = 0
  const client = appleClient('token', async () => { calls++; return respond([], { next: 'https://evil.example/v1/apps' }) })
  await assert.rejects(client('/v1/apps'), /non autorisée/); assert.equal(calls, 1)
})
test('pagination loops are incomplete, never compliant', async () => {
  const client = appleClient('token', async () => respond([], { next: '/v1/apps' }))
  await assert.rejects(client('/v1/apps'), /incomplet/)
})
for (const status of [401, 403, 404, 429, 500]) test(`Apple ${status} is Non vérifié and body is discarded`, async () => {
  const report = await runAudit({ env, transport: async () => new Response('SECRET', { status }) })
  assert(report.findings.some((f) => f.status === 'Non vérifié' && f.evidence.includes(String(status))))
  assert(!JSON.stringify(report).includes('SECRET'))
})
test('network and malformed JSON errors are sanitized', async () => {
  for (const fetcher of [async () => { throw Error('SECRET') }, async () => new Response('not json')]) {
    const report = await runAudit({ env, transport: fetcher })
    assert(report.findings.some((f) => f.status === 'Non vérifié')); assert(!JSON.stringify(report).includes('SECRET'))
  }
})
test('required missing demo credentials are detected without values', async () => {
  const report = await runAudit({ env, transport: async (url, options) => url.includes('/appStoreReviewDetail') ? respond(resource('r', { demoAccountRequired: true })) : transport(url, options) })
  assert(report.findings.some((f) => f.title === 'Compte démo requis' && f.status === 'Manquant'))
})
test('client source has no secret imports; server and page independently enforce admin', () => {
  const client = readFileSync(new URL('../../app/admin/ios-audit/audit-panel.tsx', import.meta.url), 'utf8')
  assert(!client.includes('process.env')); assert(!client.includes('core.mjs'))
  const page = readFileSync(new URL('../../app/admin/ios-audit/page.tsx', import.meta.url), 'utf8')
  assert.match(page, /if \(!await isAdminRequest\(\)\) notFound\(\)/)
  const route = readFileSync(new URL('../../app/api/admin/ios-audit/route.ts', import.meta.url), 'utf8')
  assert.match(route, /import 'server-only'/); assert.match(route, /authorizedAudit\(isAdminRequest/)
})
