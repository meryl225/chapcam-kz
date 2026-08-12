import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Supabase credentials
const SUPABASE_URL = 'https://ojmzqokffbptmcktnwdy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbXpxb2tmZmJwdG1ja3Rud2R5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTAzNTYsImV4cCI6MjA5NDg4NjM1Nn0.e9sk4b_15ge2LIIQwFpXC3n_q48ctu9IJ6oJxV85kgw'

// Rate limiting store (in-memory, resets on redeploy - use Redis for production scale)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configuration
// NB : la cle de comptage combine IP + empreinte du User-Agent (voir
// getRateLimitKey). C'est indispensable pour les reseaux mobiles a fort CGNAT
// (operateurs nigerians, ivoiriens...) ou des milliers d'abonnes partagent une
// meme IP publique : sans cela, quelques utilisateurs suffisaient a epuiser le
// quota de TOUTE l'IP et bloquaient les autres (429/403 « site inaccessible »).
const RATE_LIMITS = {
  api: { requests: 240, windowMs: 60000 },     // API generale (inclut le polling /api/points ~6/min/user)
  swap: { requests: 40, windowMs: 60000 },     // endpoints swap (demarrage de session, tokens)
  auth: { requests: 10, windowMs: 60000 },     // auth : reste strict (anti brute-force)
  payment: { requests: 20, windowMs: 60000 },  // paiement
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

// Petit hash stable (djb2) d'une chaine -> entier positif en base36. Sert a
// derfor une empreinte courte et non reversible du User-Agent.
function shortHash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0
  }
  return (h >>> 0).toString(36)
}

// Cle de rate-limit = IP + empreinte d'appareil (User-Agent). Derriere un CGNAT,
// des centaines d'utilisateurs partagent une meme IP mais ont des appareils/
// navigateurs differents : ajouter l'empreinte UA les separe en compartiments
// distincts, de sorte qu'un utilisateur n'epuise plus le quota des autres.
// Ce n'est pas un identifiant parfait, mais il reduit drastiquement les
// collisions injustes tout en gardant une protection anti-abus par appareil.
function getRateLimitKey(request: NextRequest): string {
  const ip = getClientIP(request)
  const ua = request.headers.get('user-agent') || ''
  return `${ip}#${shortHash(ua)}`
}

function checkRateLimit(client: string, endpoint: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const key = `${client}:${endpoint}`
  
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

function addSecurityHeaders(
  response: NextResponse,
  options: { allowCache?: boolean } = {},
): NextResponse {
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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://adservice.google.com https://*.google.com https://www.googletagservices.com https://*.adtrafficquality.google",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: http:",
    "media-src 'self' blob: https:",
    "connect-src 'self' https://*.supabase.co https://*.decart.ai https://*.fal.ai https://*.livekit.io wss://*.livekit.cloud https://api.paydunya.com https://*.vercel.app https://*.proxy.runpod.net wss://*.proxy.runpod.net https://*.trycloudflare.com wss://*.trycloudflare.com wss: https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.google.com https://*.doubleclick.net https://*.adtrafficquality.google",
    "frame-src 'self' https://vercel.live https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://*.google.com https://*.googlesyndication.com https://*.adtrafficquality.google",
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
  
  // Pages publiques (marketing/landing) : on autorise le cache CDN + navigateur
  // avec revalidation en arriere-plan (stale-while-revalidate). Cela evite de
  // regenerer la page a chaque visite et accelere fortement le chargement.
  if (options.allowCache) {
    response.headers.set(
      'Cache-Control',
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    )
  } else if (response.headers.get('x-middleware-cache') !== 'public') {
    // Pages sensibles (dashboard, auth, API) : jamais de cache.
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

  // App desktop native (ChapCam PC en Python) : ces routes sont appelees
  // directement par le logiciel, sans navigateur ni session. Leur User-Agent
  // (ex: "python-requests/2.x") declencherait l'anti-scraping ci-dessous, ce
  // qui renvoyait un 403. On les autorise donc publiquement, sans token.
  const isDesktopApi = pathname.startsWith('/api/desktop/')

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
    if ((isSuspicious || isEmptyUA) && !isServerWebhook && !isDesktopApi) {
      console.log(`[Security] Blocked suspicious request: ${ip} - ${userAgent}`)
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
  
  // Endpoints de POLLING authentifies, appeles a haute frequence par le client
  // pendant une session active (facturation des points toutes les ~10s,
  // heartbeat live). Ils sont deja proteges cote serveur (session requise) et ne
  // doivent PAS etre rate-limites, sinon un simple swap prolonge finit par se
  // faire couper — surtout derriere un CGNAT ou le compteur est partage.
  const isAuthenticatedPolling =
    pathname === '/api/points' || pathname === '/api/live/heartbeat'

  // 3. Rate limiting for API routes (les webhooks serveur et l'app desktop sont exemptes)
  if (pathname.startsWith('/api/') && !isServerWebhook && !isDesktopApi && !isAuthenticatedPolling) {
    // Cle par appareil (IP + empreinte UA) pour ne pas penaliser les reseaux CGNAT.
    const { allowed, remaining } = checkRateLimit(getRateLimitKey(request), pathname)
    
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
  
  // 3bis. Court-circuit pour les pages PUBLIQUES.
  // Seules les routes protegees / d'authentification ont besoin de connaitre la
  // session. Pour tout le reste (page d'accueil, pages marketing, etc.) on evite
  // l'appel reseau `supabase.auth.getUser()` — qui ajoutait des centaines de ms
  // de latence a CHAQUE navigation — et on autorise la mise en cache.
  const needsAuth =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/numbers/app') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth')

  if (!needsAuth) {
    return addSecurityHeaders(NextResponse.next({ request }), { allowCache: true })
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

  // Protect ChapCam Numbers app routes (mêmes identifiants que chapcam.com)
  if (pathname.startsWith('/numbers/app') && !user) {
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
