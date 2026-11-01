import { createPrivateKey, sign } from 'node:crypto'

export const requiredVariables = ['ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_PRIVATE_KEY']
const origin = 'https://api.appstoreconnect.apple.com'
export function createToken(env) {
  const key = createPrivateKey(env.ASC_PRIVATE_KEY.replace(/\\n/g, '\n'))
  if (key.asymmetricKeyDetails?.namedCurve !== 'prime256v1') throw new Error('Configuration ASC invalide')
  const now = Math.floor(Date.now() / 1000)
  const encode = (x) => Buffer.from(JSON.stringify(x)).toString('base64url')
  const input = `${encode({ alg: 'ES256', kid: env.ASC_KEY_ID, typ: 'JWT' })}.${encode({ iss: env.ASC_ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' })}`
  return `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`
}
export function appleClient(token, transport = fetch) {
  let requests = 0
  const deadline = Date.now() + 180000
  return async function list(path) {
    const rows = [], visited = new Set()
    let next = path
    while (next) {
      const url = new URL(next, origin)
      if (url.origin !== origin || url.username || url.password || !/^\/v[12]\//.test(url.pathname)) throw new Error('Pagination Apple non autorisée')
      if (visited.has(url.href) || visited.size >= 100 || ++requests > 600 || Date.now() > deadline) throw new Error('Audit incomplet : limite de pagination ou de durée')
      visited.add(url.href)
      let response
      try { response = await transport(url.href, { method: 'GET', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(12000) }) }
      catch { throw new Error('Apple inaccessible ou délai dépassé') }
      if (!response.ok) throw new Error(`Apple HTTP ${response.status} : ressource non vérifiée`)
      let body
      try { body = await response.json() } catch { throw new Error('Réponse Apple illisible') }
      if (!Object.hasOwn(body, 'data')) throw new Error('Réponse Apple incomplète')
      rows.push(...(Array.isArray(body.data) ? body.data : body.data ? [body.data] : []))
      next = body.links?.next
      if (next && typeof next !== 'string') throw new Error('Pagination Apple invalide')
    }
    return rows
  }
}
const present = (value) => typeof value === 'string' && value.trim().length > 0
const webUrl = (value) => { try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false } }
const safe = (value) => typeof value === 'string' && /^[A-Za-z0-9_. -]{1,80}$/.test(value) ? value : 'inconnu'

/** @param {{ env?: Record<string, string | undefined>, transport?: typeof fetch, project?: Array<{title: string, status: string, evidence: string, action: string, scope: string}> }} options */
export async function runAudit({ env = {}, transport = fetch, project = [] } = {}) {
  const report = { date: new Date().toISOString(), target: { appId: '6818781411', bundleId: 'com.chapcam.app', requestedVersion: '2.0', requestedBuild: '28', version: null, build: null, state: null }, missingVariables: requiredVariables.filter((key) => !env[key]?.trim()), findings: [...project] }
  const add = (title, status, evidence, action = 'Vérifier dans App Store Connect avant soumission.') => report.findings.push({ title, status, evidence, action, scope: 'API Apple • lecture seule' })
  for (const title of ['Déclarations de confidentialité et collecte des fournisseurs', 'Âge et classement du contenu', 'Accords, fiscalité et conformité export', 'Tests iPhone/iPad : connexion, achats, restauration, suppression', 'Couverture des appareils et cohérence des captures', 'Lien entre source du dépôt et binaire soumis']) add(title, 'À vérifier', 'Contrôle manuel : aucune validation automatique ni test sur appareil.', 'Contrôler le build effectivement soumis et conserver les preuves.')
  if (report.missingVariables.length) {
    add('Connexion Apple', 'Non vérifié', `Variables absentes : ${report.missingVariables.join(', ')}`, 'Configurer ces secrets côté serveur dans Vercel > Settings > Environment Variables, puis redéployer. Clé équipe App Store Connect, Users and Access > Integrations. Ne jamais coller la clé dans le chat.')
    return report
  }
  let get
  try { get = appleClient(createToken(env), transport) } catch { add('Connexion Apple', 'Non vérifié', 'Clé ASC invalide : vérifier le format .p8 et ES256.'); return report }
  async function load(title, path) {
    try { return await get(path) } catch (error) { add(title, 'Non vérifié', error.message); return null }
  }
  function fields(title, item, keys, urls = []) {
    const absent = keys.filter((key) => !present(item?.[key])).concat(urls.filter((key) => !webUrl(item?.[key])))
    add(title, absent.length ? 'Manquant' : 'Vérifié', absent.length ? `Champs absents ou invalides : ${absent.join(', ')}` : 'Présence des champs vérifiée uniquement ; valeurs et données personnelles exclues du rapport.')
  }
  const app = await load('Identité de l’application', '/v1/apps/6818781411')
  if (!app) return report
  if (app[0]?.attributes?.bundleId !== report.target.bundleId) { add('Identité de l’application', 'Manquant', 'Bundle ID différent de com.chapcam.app ou application absente.'); return report }
  add('Identité de l’application', 'Vérifié', 'App 6818781411 • com.chapcam.app')
  const versions = await load('Versions iOS', '/v1/apps/6818781411/appStoreVersions?filter[platform]=IOS&limit=200')
  const version = versions?.find((v) => v.attributes?.versionString === '2.0' && v.attributes?.platform === 'IOS')
  if (!version) { if (versions) add('Version 2.0', 'Manquant', 'Version iOS 2.0 absente de la réponse Apple paginée.'); return report }
  report.target.version = safe(version.attributes.versionString)
  report.target.state = safe(version.attributes.appStoreState)
  add('Version et statut Apple', 'Vérifié', `Version ${report.target.version} • ${report.target.state}. Observation, pas une approbation.`)
  const base = `/v1/appStoreVersions/${encodeURIComponent(version.id)}`
  const builds = await load('Build attaché', `${base}/build`)
  if (builds) {
    const b = builds[0]?.attributes
    report.target.build = b ? safe(b.version) : null
    add('Build attaché', !b ? 'Manquant' : b.version === '28' ? 'Vérifié' : 'À vérifier', b ? `Build réellement attaché : ${safe(b.version)} ; attendu : 28.` : 'Aucun build attaché.')
    if (b) add('Traitement du build', b.processingState === 'VALID' && b.expired === false ? 'Vérifié' : 'À vérifier', `État : ${safe(b.processingState)} ; expiré : ${b.expired === true ? 'oui' : b.expired === false ? 'non' : 'inconnu'}.`)
  }
  const review = await load('Équipe de vérification et compte démo', `${base}/appStoreReviewDetail`)
  if (review) {
    const a = review[0]?.attributes
    fields('Coordonnées de vérification', a, ['contactFirstName', 'contactLastName', 'contactEmail', 'contactPhone'])
    if (a?.demoAccountRequired === true) fields('Compte démo requis', a, ['demoAccountName', 'demoAccountPassword'])
    else add('Compte démo', 'À vérifier', 'Compte démo non déclaré requis ou champ inconnu. Vérifier si les fonctions nécessitent une connexion.')
  }
  const infos = await load('Informations localisées de l’application', '/v1/apps/6818781411/appInfos?limit=200')
  const localized = []
  if (infos) for (const info of infos) {
    const rows = await load(`Informations de fiche (${safe(info.attributes?.appStoreState)})`, `/v1/appInfos/${encodeURIComponent(info.id)}/appInfoLocalizations?limit=200`)
    if (rows) for (const row of rows) { localized.push(row); fields(`Nom et confidentialité • ${safe(row.attributes?.locale)} • ${safe(info.attributes?.appStoreState)}`, row.attributes, ['name'], ['privacyPolicyUrl']) }
  }
  const locales = await load('Langues de la version', `${base}/appStoreVersionLocalizations?limit=200`)
  if (locales?.length === 0) add('Langues de la version', 'Manquant', 'Aucune localisation.')
  if (locales) for (const locale of locales) {
    const lang = safe(locale.attributes?.locale)
    fields(`Description et assistance • ${lang}`, locale.attributes, ['description'], ['supportUrl'])
    if (!localized.some((l) => l.attributes?.locale === locale.attributes?.locale)) add(`Nom et confidentialité • ${lang}`, 'Non vérifié', 'Aucune information de fiche correspondante accessible. Vérifier la langue et les éventuels mécanismes de repli.')
    for (const [setsName, filesName, category, required] of [['appScreenshotSets', 'appScreenshots', 'screenshotDisplayType', true], ['appPreviewSets', 'appPreviews', 'previewType', false]]) {
      const sets = await load(`${setsName} • ${lang}`, `/v1/appStoreVersionLocalizations/${encodeURIComponent(locale.id)}/${setsName}?limit=200`)
      if (sets?.length === 0) add(`${setsName} • ${lang}`, required ? 'Manquant' : 'À vérifier', required ? 'Aucune capture.' : 'Aucun aperçu ; généralement facultatif.')
      if (sets) for (const set of sets) {
        const title = `${filesName} • ${lang} • ${safe(set.attributes?.[category])}`
        const files = await load(title, `/v1/${setsName}/${encodeURIComponent(set.id)}/${filesName}?limit=200`)
        if (files) add(title, !files.length ? 'Manquant' : files.every((f) => f.attributes?.assetDeliveryState?.state === 'COMPLETE') ? 'Vérifié' : 'À vérifier', `${files.length} fichier(s). États : ${files.map((f) => safe(f.attributes?.assetDeliveryState?.state)).join(', ') || 'aucun'}. Contenu visuel non contrôlé.`)
      }
    }
  }
  async function products(items, kind, apiVersion, localizationName) {
    if (!items) return
    if (!items.length) add(kind, 'À vérifier', 'Aucun produit retourné. Comparer avec les offres de l’application.')
    for (const [index, item] of items.entries()) {
      const state = safe(item.attributes?.state)
      const title = `${kind} ${index + 1}`
      add(title, state === 'MISSING_METADATA' ? 'Manquant' : 'À vérifier', `Statut Apple : ${state}. Vérifier prix, disponibilité et association à la soumission.`)
      const p = `/${apiVersion}/${kind === 'Achat intégré' ? 'inAppPurchases' : 'subscriptions'}/${encodeURIComponent(item.id)}`
      const rows = await load(`${title} • langues`, `${p}/${localizationName}?limit=200`)
      if (rows?.length === 0) add(`${title} • langues`, 'Manquant', 'Aucune traduction produit.')
      if (rows) for (const row of rows) fields(`${title} • ${safe(row.attributes?.locale)}`, row.attributes, ['name', 'description'])
      const screenshot = await load(`${title} • capture de revue`, `${p}/appStoreReviewScreenshot`)
      if (screenshot) add(`${title} • capture de revue`, !screenshot.length ? 'Manquant' : screenshot[0].attributes?.assetDeliveryState?.state === 'COMPLETE' ? 'Vérifié' : 'À vérifier', 'Présence et état du fichier uniquement ; contenu non examiné.')
    }
  }
  await products(await load('Achats intégrés', '/v1/apps/6818781411/inAppPurchasesV2?limit=200'), 'Achat intégré', 'v2', 'inAppPurchaseLocalizations')
  const groups = await load('Groupes d’abonnements', '/v1/apps/6818781411/subscriptionGroups?limit=200')
  if (groups?.length === 0) add('Abonnements', 'À vérifier', 'Aucun groupe retourné.')
  if (groups) for (const group of groups) await products(await load('Abonnements', `/v1/subscriptionGroups/${encodeURIComponent(group.id)}/subscriptions?limit=200`), 'Abonnement', 'v1', 'subscriptionLocalizations')
  return report
}

export async function authorizedAudit(authorize, execute) {
  if (!await authorize()) return Response.json({ error: 'Accès administrateur requis' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  try { return Response.json(await execute(), { headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } }) }
  catch { return Response.json({ error: 'Audit interrompu ; aucun résultat global ne peut être confirmé.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } }) }
}
