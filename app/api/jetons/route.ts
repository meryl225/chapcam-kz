import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getJetonsBalance } from '@/lib/jetons'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  return NextResponse.json(await getJetonsBalance(user.id))
}
