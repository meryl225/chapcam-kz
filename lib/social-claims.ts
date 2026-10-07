import 'server-only'
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'
import { createAdminClient } from '@/lib/supabase/admin'
import { grantSocialBonusOnce, hasClaimedSocialBonus, SOCIAL_BONUS_JETONS } from '@/lib/jetons'

export const SOCIAL_PROOF_BUCKET = 'social-proofs'
export const MAX_PROOFS = 4
export const MAX_PROOF_BYTES = 8 * 1024 * 1024
export const PROOF_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

export type SocialClaimStatus = 'pending' | 'approved' | 'rejected'
export type SocialBonusState = 'none' | SocialClaimStatus

export type SocialClaim = {
  id: string
  user_id: string
  status: SocialClaimStatus
  proof_urls: string[]
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  reward_amount: number
}

let client: NeonQueryFunction<false, false> | null = null
function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    client = neon(process.env.DATABASE_URL)
  }
  return client
}

let tableReady = false
async function ensureTable() {
  if (tableReady) return
  const sql = db()
  await sql`
    CREATE TABLE IF NOT EXISTS social_reward_claims (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id text NOT NULL,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      proof_urls text[] NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now(),
      reviewed_at timestamptz,
      reviewed_by text,
      reward_amount integer NOT NULL DEFAULT ${SOCIAL_BONUS_JETONS}
    )
  `
  // A user can only hold one open or approved claim; rejected claims allow a new submission.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS social_reward_claims_one_active
    ON social_reward_claims (user_id) WHERE status IN ('pending', 'approved')
  `
  await sql`CREATE INDEX IF NOT EXISTS social_reward_claims_status_created ON social_reward_claims (status, created_at DESC)`
  tableReady = true
}

export async function getSocialBonusState(userId: string): Promise<SocialBonusState> {
  // DDL can be refused by the production role even though the table exists: never let it hide the bonus.
  await ensureTable().catch((error) => console.error('[social-claims] ensureTable:', error))
  let rows: Array<{ status: SocialClaimStatus }> = []
  try {
    rows = (await db()`
      SELECT status FROM social_reward_claims WHERE user_id = ${userId}
      ORDER BY (status = 'approved') DESC, created_at DESC LIMIT 1
    `) as Array<{ status: SocialClaimStatus }>
  } catch (error) {
    console.error('[social-claims] lecture statut:', error)
  }
  if (rows[0]?.status === 'approved') return 'approved'
  // Accounts credited by the earlier self-declared flow stay marked as claimed.
  if (await hasClaimedSocialBonus(userId)) return 'approved'
  return rows[0]?.status ?? 'none'
}

export async function createPendingClaim(userId: string, proofPaths: string[]) {
  await ensureTable()
  const rows = (await db()`
    INSERT INTO social_reward_claims (user_id, status, proof_urls, reward_amount)
    VALUES (${userId}, 'pending', ${proofPaths}, ${SOCIAL_BONUS_JETONS})
    ON CONFLICT (user_id) WHERE status IN ('pending', 'approved') DO NOTHING
    RETURNING id
  `) as Array<{ id: string }>
  return rows[0]?.id ?? null
}

export async function listClaims(status: SocialClaimStatus | 'all', limit = 100) {
  await ensureTable()
  const sql = db()
  const rows = status === 'all'
    ? await sql`SELECT * FROM social_reward_claims ORDER BY created_at DESC LIMIT ${limit}`
    : await sql`SELECT * FROM social_reward_claims WHERE status = ${status} ORDER BY created_at DESC LIMIT ${limit}`
  return rows as SocialClaim[]
}

/** Moves a pending claim to approved and credits the reward exactly once per account. */
export async function approveClaim(claimId: string, reviewer: string) {
  await ensureTable()
  const rows = (await db()`
    UPDATE social_reward_claims SET status = 'approved', reviewed_at = now(), reviewed_by = ${reviewer}
    WHERE id = ${claimId} AND status = 'pending'
    RETURNING user_id
  `) as Array<{ user_id: string }>
  const userId = rows[0]?.user_id
  if (!userId) return { ok: false as const }
  const credit = await grantSocialBonusOnce(userId)
  return { ok: true as const, userId, credited: credit.credited, balance: credit.balance }
}

export async function rejectClaim(claimId: string, reviewer: string) {
  await ensureTable()
  const rows = (await db()`
    UPDATE social_reward_claims SET status = 'rejected', reviewed_at = now(), reviewed_by = ${reviewer}
    WHERE id = ${claimId} AND status = 'pending'
    RETURNING id
  `) as Array<{ id: string }>
  return { ok: rows.length > 0 }
}

let bucketReady = false
export async function ensureProofBucket() {
  if (bucketReady) return
  const storage = createAdminClient().storage
  const { data } = await storage.getBucket(SOCIAL_PROOF_BUCKET)
  if (!data) {
    const { error } = await storage.createBucket(SOCIAL_PROOF_BUCKET, {
      public: false,
      fileSizeLimit: MAX_PROOF_BYTES,
      allowedMimeTypes: Object.keys(PROOF_TYPES),
    })
    if (error && !/already exists/i.test(error.message)) throw error
  }
  bucketReady = true
}

export async function signProofUrls(paths: string[]) {
  if (paths.length === 0) return []
  const { data, error } = await createAdminClient().storage.from(SOCIAL_PROOF_BUCKET).createSignedUrls(paths, 60 * 60)
  if (error || !data) return []
  return data.map((item) => item.signedUrl).filter(Boolean) as string[]
}
