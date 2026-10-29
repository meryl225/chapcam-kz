import { endLiveSession, startLiveSession } from '@/lib/live-engine/session-handlers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request) {
  return startLiveSession(request, { legacy: false })
}

export function DELETE(request: Request) {
  return endLiveSession(request)
}
