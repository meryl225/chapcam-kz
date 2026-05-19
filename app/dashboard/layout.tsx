import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardSidebar, PlanGuardBanner } from '@/components/dashboard/sidebar'

/*
subscriptions table schema:
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users UNIQUE,
  plan text CHECK (plan IN ('free','1day','30days','90days','365days')) DEFAULT 'free',
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true
);

user_avatars table schema:
CREATE TABLE user_avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  name text NOT NULL,
  url text NOT NULL,
  is_custom boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
*/

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // Auth protection
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Fetch subscription data
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, expires_at, is_active')
    .eq('user_id', user.id)
    .single()

  // Fetch avatar count
  const { count: avatarCount } = await supabase
    .from('user_avatars')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const plan = subscription?.plan ?? 'free'
  const expiresAt = subscription?.expires_at ?? null
  const isActive = subscription?.is_active ?? false

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <DashboardSidebar
        email={user.email}
        plan={plan}
        expiresAt={expiresAt}
        isActive={isActive}
        avatarCount={avatarCount ?? 0}
      />
      
      <PlanGuardBanner
        plan={plan}
        expiresAt={expiresAt}
        isActive={isActive}
      />

      {/* Main Content Area */}
      <main className="min-h-screen pt-14 md:ml-[240px] md:pt-0">
        {/* Add padding top when plan guard banner is shown */}
        <div className={plan === 'free' || !isActive ? 'pt-12' : ''}>
          {children}
        </div>
      </main>

    </div>
  )
}
