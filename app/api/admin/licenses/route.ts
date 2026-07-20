import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Liste toutes les licences ChapCam PC (reservee a l'admin).
export async function GET() {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('pc_licenses')
      .select('id, email, license_key, hardware_id, status, activated_at, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/licenses] Lecture echouee:', error.message)
      return NextResponse.json({ error: 'Erreur serveur (table pc_licenses absente ?).' }, { status: 500 })
    }

    const licenses = (data || []).map((l) => ({
      id: l.id,
      email: l.email,
      licenseKey: l.license_key,
      activated: !!l.hardware_id,
      status: l.status,
      activatedAt: l.activated_at,
      createdAt: l.created_at,
    }))

    return NextResponse.json({
      licenses,
      stats: {
        total: licenses.length,
        active: licenses.filter((l) => l.status === 'active').length,
        revoked: licenses.filter((l) => l.status === 'revoked').length,
        activated: licenses.filter((l) => l.activated).length,
        suspectedSharing: licenses.filter((l) => l.status === 'suspected_sharing').length,
      },
    })
  } catch (err: any) {
    console.error('[admin/licenses] Exception:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}

// Revoque, reactive ou reinitialise (change de PC) une licence.
// Corps : { id: string, action: 'revoke' | 'reactivate' | 'reset' }
export async function POST(request: NextRequest) {
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: 'Acces refuse.' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const id = String(body.id || '')
    const action = String(body.action || '')

    const admin = createAdminClient()

    // Action de masse : detacher TOUTES les licences de leur PC pour permettre
    // a chaque client de reactiver sur son ordinateur (debloque les faux
    // "deja active sur un autre PC"). Ne touche pas aux licences revoquees.
    if (action === 'reset-all') {
      const { data, error } = await admin
        .from('pc_licenses')
        .update({ hardware_id: null, activated_at: null })
        .neq('status', 'revoked')
        .not('hardware_id', 'is', null)
        .select('id')

      if (error) {
        console.error('[admin/licenses] reset-all echoue:', error.message)
        return NextResponse.json({ error: 'Detachement global impossible.' }, { status: 500 })
      }

      return NextResponse.json({ success: true, detached: data?.length ?? 0 })
    }

    if (!id || !['revoke', 'reactivate', 'reset'].includes(action)) {
      return NextResponse.json({ error: 'Parametres invalides.' }, { status: 400 })
    }

    // 'reset' : detache le PC actuel pour permettre une reactivation ailleurs.
    // 'reactivate' : repasse en 'active' et efface les drapeaux de partage.
    const patch =
      action === 'revoke'
        ? { status: 'revoked' }
        : action === 'reactivate'
          ? { status: 'active', flagged_at: null, flag_reason: null }
          : { hardware_id: null, activated_at: null, status: 'active' }

    const { error } = await admin.from('pc_licenses').update(patch).eq('id', id)
    if (error) {
      console.error('[admin/licenses] Maj echouee:', error.message)
      return NextResponse.json({ error: 'Mise a jour impossible.' }, { status: 500 })
    }

    // Reactivation : on remet a zero la fenetre anti-partage (on efface les
    // machines connues) pour que le client legitime reparte proprement et ne
    // soit pas immediatement rebloque. Best-effort.
    if (action === 'reactivate') {
      try {
        const { data: lic } = await admin
          .from('pc_licenses')
          .select('license_key')
          .eq('id', id)
          .maybeSingle()
        if (lic?.license_key) {
          await admin.from('pc_license_machines').delete().eq('license_key', lic.license_key)
        }
      } catch (e) {
        console.warn('[admin/licenses] Reset machines ignore:', (e as Error).message)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[admin/licenses] Exception POST:', err?.message || err)
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 })
  }
}
