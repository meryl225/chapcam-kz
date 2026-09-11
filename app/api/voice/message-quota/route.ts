import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveVoiceMessageBalance } from '@/lib/voice-message-access'

export const dynamic = 'force-dynamic'

// Solde de credits Message Vocal de l'utilisateur (pool partage TTS + voix).
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const { balance, subActive, plan } = await resolveVoiceMessageBalance(supabase, user.id)
  return NextResponse.json({
    success: true,
    plan,
    subActive,
    remaining: Math.max(0, balance),
  })
}
