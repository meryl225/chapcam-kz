import { endLiveSession, startLiveSession } from '@/lib/live-engine/session-handlers'

// Compatibility path for mobile builds already installed on devices (they hardcode this URL).
// Remove once every store build calls /api/live/session.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function POST(request: Request) {
  return startLiveSession(request, { legacy: true })
}

export function DELETE(request: Request) {
  return endLiveSession(request)
}
