import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestGeo } from '@/lib/geo'
import { DashboardSidebar, PlanGuardBanner } from '@/components/dashboard/sidebar'
import { TelegramSupport } from '@/components/telegram-support'
import { ChapCam2Announcement } from '@/components/dashboard/chapcam-2-announcement'
import { AnniversaryOfferPopup } from '@/components/dashboard/anniversary-offer-popup'

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

  // Localisation approximative (pays/ville) fournie par l'edge Vercel.
  // On lit les en-tetes pendant la requete, puis on enregistre APRES la reponse
  // via after() pour ne PAS ralentir l'affichage du dashboard.
  const geo = await getRequestGeo()
  const userId = user.id
  after(async () => {
    if (!geo.country) return // pas de donnee (local/preview) -> on n'ecrit rien
    try {
      const admin = createAdminClient()
      await admin.from('user_geo').upsert(
        {
          user_id: userId,
          country: geo.country,
          region: geo.region,
          city: geo.city,
          latitude: geo.latitude,
          longitude: geo.longitude,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
    } catch (e) {
      console.error('[geo] Enregistrement position echoue:', e)
    }
  })

  // Fetch subscription data avec points
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, expires_at, is_active, points, max_points')
    .eq('user_id', user.id)
    .single()

  // Fetch avatar count
  const { count: avatarCount } = await supabase
    .from('user_avatars')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  // Fetch solde de minutes Voice Swap (ChapVoice) — produit distinct des points
  const { data: voiceSub } = await supabase
    .from('voice_subscriptions')
    .select('seconds_remaining, expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const voiceExpired = voiceSub?.expires_at ? new Date(voiceSub.expires_at) < new Date() : false
  const voiceSecondsRemaining = voiceExpired ? 0 : voiceSub?.seconds_remaining ?? 0

  const plan = subscription?.plan ?? 'free'
  const expiresAt = subscription?.expires_at ?? null
  const isActive = subscription?.is_active ?? false
  const pointsRemaining = subscription?.points ?? 0
  const pointsTotal = subscription?.max_points ?? 0

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        email={user.email}
        plan={plan}
        expiresAt={expiresAt}
        isActive={isActive}
        avatarCount={avatarCount ?? 0}
        pointsRemaining={pointsRemaining}
        pointsTotal={pointsTotal}
      />
      
      <PlanGuardBanner
        plan={plan}
        expiresAt={expiresAt}
        isActive={isActive}
        pointsRemaining={pointsRemaining}
        voiceSecondsRemaining={voiceSecondsRemaining}
      />

      {/* Main Content Area */}
      <main className="min-h-screen pt-14 md:ml-[240px] md:pt-0">
        {/* Add padding top when plan guard banner is shown */}
        <div className={plan === 'free' || !isActive ? 'pt-12' : ''}>
          {children}
        </div>
      </main>

      {/* Telegram Support Button */}
      <TelegramSupport />

      {/* Popup d'annonce ChapCam 2.0 (affiche une fois apres connexion) */}
      <ChapCam2Announcement />

      {/* Popup offre anniversaire 3 mois (affiche une fois a l'arrivee) */}
      <AnniversaryOfferPopup />
    </div>
  )
}
