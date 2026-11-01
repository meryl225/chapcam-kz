import 'server-only'
import { isAdminRequest } from '@/lib/admin-auth'
import { authorizedAudit, runAudit } from '@/lib/ios-audit/core.mjs'
import { projectFindings } from '@/lib/ios-audit/project.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 240

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
      request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return Response.json({ error: 'Origine non autorisée' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }
  return authorizedAudit(isAdminRequest, () => runAudit({
    env: {
      ASC_KEY_ID: process.env.ASC_KEY_ID,
      ASC_ISSUER_ID: process.env.ASC_ISSUER_ID,
      ASC_PRIVATE_KEY: process.env.ASC_PRIVATE_KEY,
    },
    project: projectFindings,
  }))
}
