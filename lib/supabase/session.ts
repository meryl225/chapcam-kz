import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// React `cache` is scoped to a single server request: the dashboard layout and
// page render in parallel and share these results instead of each calling
// Supabase. Nothing is shared between users or between requests.

export const getRequestSupabase = cache(() => createClient())

// Still a full `auth.getUser()` (token validated by Supabase), just once per request.
export const getCurrentUser = cache(async () => {
  const supabase = await getRequestSupabase()
  const { data, error } = await supabase.auth.getUser()
  return error ? null : data.user
})

export const getSubscription = cache(async (userId: string) => {
  const supabase = await getRequestSupabase()
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, expires_at, is_active, points, max_points')
    .eq('user_id', userId)
    .maybeSingle()
  return data
})

export const getAvatarCount = cache(async (userId: string) => {
  const supabase = await getRequestSupabase()
  const { count } = await supabase
    .from('user_avatars')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
})
