import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isAdminRequest } from '@/lib/admin-auth'
import AuditPanel from './audit-panel'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Audit iOS — Administration ChapCam', robots: { index: false, follow: false } }

export default async function IosAuditPage() {
  if (!await isAdminRequest()) notFound()
  return <AuditPanel />
}
