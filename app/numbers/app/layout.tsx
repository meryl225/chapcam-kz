import type { Metadata } from 'next'
import { NumbersProvider } from '@/components/numbers/numbers-provider'
import { AppSidebar } from '@/components/numbers/app-sidebar'

export const metadata: Metadata = {
  title: 'Dashboard — ChapCam Numbers',
  description: 'Manage virtual numbers, receive SMS, and access developer APIs.',
}

export default function NumbersAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NumbersProvider>
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar />
        <main className="min-h-screen pt-14 md:ml-[248px] md:pt-0">{children}</main>
      </div>
    </NumbersProvider>
  )
}
