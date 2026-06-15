import type { Metadata } from 'next'
import { NumbersProvider } from '@/components/numbers/numbers-provider'
import { AppSidebar } from '@/components/numbers/app-sidebar'
import { AppTopbar } from '@/components/numbers/app-topbar'
import { ToastHost } from '@/components/numbers/toast-host'

export const metadata: Metadata = {
  title: 'Dashboard — ChapCam Numbers',
  description: 'Manage virtual numbers, receive SMS, and access developer APIs.',
}

export default function NumbersAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NumbersProvider>
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
