import { NextResponse } from 'next/server'

const BASE = 'https://api.sms-man.com/control'

export async function GET() {
  const token = process.env.SMSMAN_API_TOKEN ?? ''
  if (!token) return NextResponse.json({ error: 'no token in env' })
  const j = async (p: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams({ token, ...params })
    const r = await fetch(`${BASE}${p}?${qs}`, { cache: 'no-store' })
    const t = await r.text()
    try {
      return JSON.parse(t)
    } catch {
      return t
    }
  }
  const balance = await j('/get-balance')
  const cs = await j('/countries')
  const apps = await j('/applications')
  const list = (x: unknown): any[] => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x as object) : [])
  const it = list(cs).find((c: any) => String(c.code).toUpperCase() === 'IT')
  const wa = list(apps).find((a: any) => String(a.title ?? '').toLowerCase() === 'whatsapp')
  const prices = it && wa ? await j('/get-prices', { country_id: String(it.id), application_id: String(wa.id) }) : null
  const getNumber = it && wa ? await j('/get-number', { country_id: String(it.id), application_id: String(wa.id) }) : null
  return NextResponse.json({ balance, it: it?.id, wa: wa?.id, prices, getNumber })
}
