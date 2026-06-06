import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Supabase credentials
const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

// Rate limiting store (in-memory, resets on redeploy - use Redis for production scale)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
const RATE_LIMITS = {
  api: { requests: 60, windowMs: 60000 },      // 60 req/min for general API
  swap: { requests: 10, windowMs: 60000 },     // 10 req/min for swap endpoints
  auth: { requests: 5, windowMs: 60000 },      // 5 req/min for auth endpoints
  payment: { requests: 10, windowMs: 60000 },  // 10 req/min for payment
}

// Blocked patterns (anti-scraping)
const BLOCKED_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /config\./i,
  /secrets/i,
  /\.sql/i,
  /backup/i,
]

// Suspicious user agents (bots, scrapers)
const SUSPICIOUS_USER_AGENTS = [
  /curl/i,
  /wget/i,
  /python/i,
  /scrapy/i,
  /httpclient/i,
  /java\//i,
  /libwww/i,
  /mechanize/i,
]

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || realIP || 'unknown'
}

function checkRateLimit(ip: string, endpoint: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const key = `${ip}:${endpoint}`
  
  // Determine rate limit based on endpoint
  let limit = RATE_LIMITS.api
  if (endpoint.includes('/swap') || endpoint.includes('/decart') || endpoint.includes('/fal')) {
    limit = RATE_LIMITS.swap
  } else if (endpoint.includes('/auth')) {
    limit = RATE_LIMITS.auth
  } else if (endpoint.includes('/payment')) {
    limit = RATE_LIMITS.payment
  }
  
  const record = rateLimitStore.get(key)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs })
    return { allowed: true, remaining: limit.requests - 1 }
  }
  
  if (record.count >= limit.requests) {
    return { allowed: false, remaining: 0 }
  }
  
  record.count++
  return { allowed: true, remaining: limit.requests - record.count }
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.decart.ai https://*.fal.ai https://*.livekit.io wss://*.livekit.cloud https://api.paydunya.com https://*.vercel.app https://*.proxy.runpod.net wss://*.proxy.runpod.net https://*.trycloudflare.com wss://*.trycloudflare.com wss:",
    "frame-src 'self' https://vercel.live",
    "worker-src 'self' blob:",
  ].join('; '))
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', [
    'camera=(self)',
    'microphone=(self)',
    'geolocation=()',
    'payment=(self)',
  ].join(', '))
  
  // HSTS (Strict Transport Security)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  
  // Prevent caching of sensitive pages
  if (response.headers.get('x-middleware-cache') !== 'public') {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }
  
  // Remove server identification
  response.headers.delete('X-Powered-By')
  response.headers.delete('Server')
  
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || ''

  // Webhooks serveur-a-serveur (IPN PayDunya, etc.) : ils arrivent depuis un
  // serveur (UA non-navigateur, souvent vide ou de type PHP/Guzzle) et SANS
  // cookie. Ils ne doivent jamais etre bloques par l'anti-scraping ni le
  // rate-limit, sinon le credit automatique ne se declenche pas.
  const isServerWebhook =
    pathname.includes('/webhook') ||
    pathname === '/api/payment/callback' ||
    pathname.startsWith('/api/cron')

  // 1. Block suspicious patterns (anti-scraping)
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }
  
  // 2. Block suspicious user agents on API routes (allow browsers)
  if (pathname.startsWith('/api/')) {
    const isSuspicious = SUSPICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent))
    const isEmptyUA = !userAgent || userAgent.length < 10
    
    // Allow empty UA only for webhooks
    if ((isSuspicious || isEmptyUA) && !isServerWebhook) {
      console.log(`[Security] Blocked suspicious request: ${ip} - ${userAgent}`)
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
  
  // 3. Rate limiting for API routes (les webhooks serveur sont exemptes)
  if (pathname.startsWith('/api/') && !isServerWebhook) {
    const { allowed, remaining } = checkRateLimit(ip, pathname)
    
    if (!allowed) {
      console.log(`[Security] Rate limit exceeded: ${ip} on ${pathname}`)
      const response = new NextResponse('Too Many Requests', { status: 429 })
      response.headers.set('Retry-After', '60')
      response.headers.set('X-RateLimit-Remaining', '0')
      return addSecurityHeaders(response)
    }
    
    // For API routes, just add headers and continue
    if (!pathname.startsWith('/api/auth') && !pathname.includes('/dashboard')) {
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      return addSecurityHeaders(response)
    }
  }
  
  // 4. Supabase auth for protected routes
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  // Protect admin routes - only admin can access
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return addSecurityHeaders(NextResponse.redirect(url))
    }
    // Only allow admin email
    if (user.email !== 'fanny.guck@gmail.com') {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  // Redirect logged-in users away from auth pages
  if (user && (pathname.startsWith('/auth/login') || pathname.startsWith('/auth/sign-up'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return addSecurityHeaders(NextResponse.redirect(url))
  }

  return addSecurityHeaders(supabaseResponse)
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/auth/:path*',
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
