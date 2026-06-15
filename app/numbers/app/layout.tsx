import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NumbersProvider } from '@/components/numbers/numbers-provider'
import { AppSidebar } from '@/components/numbers/app-sidebar'
import { AppTopbar } from '@/components/numbers/app-topbar'
import { ToastHost } from '@/components/numbers/toast-host'

export const metadata: Metadata = {
  title: 'Espace — ChapCam Numbers',
  description: 'Gérez vos numéros virtuels, recevez vos SMS et accédez aux API développeur.',
}

export default async function NumbersAppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Même session que chapcam.com : on réutilise les identifiants Supabase.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/auth/login')
  }

  // Identité issue de la session chapcam.com (mêmes identifiants).
  const accountUser = {
    name:
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email?.split('@')[0] ||
      'Mon compte',
    email: user.email ?? '',
  }

  return (
    <NumbersProvider user={accountUser}>
      <div className="min-h-screen bg-[#0a0e1a] text-white">
        <AppSidebar />
        <div className="flex min-h-screen flex-col pt-14 md:ml-[248px] md:pt-0">
          <AppTopbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
        <ToastHost />
      </div>
    </NumbersProvider>
  )
}
