import { NextRequest, NextResponse } from 'next/server'

// Types
interface RateLimitConfig {
  requests: number
  windowMs: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
}

// In-memory store for development (use Redis/Upstash for production)
const memoryStore = new Map<string, { count: number; resetTime: number }>()

// Rate limit configurations by endpoint type
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Swap endpoints - most expensive operations
  swap: { requests: 10, windowMs: 60000 },      // 10/min
  decart: { requests: 10, windowMs: 60000 },    // 10/min
  fal: { requests: 10, windowMs: 60000 },       // 10/min
  runpod: { requests: 5, windowMs: 60000 },     // 5/min
  livekit: { requests: 20, windowMs: 60000 },   // 20/min
  
  // Auth endpoints - prevent brute force
  auth: { requests: 5, windowMs: 60000 },       // 5/min
  login: { requests: 5, windowMs: 300000 },     // 5/5min
  register: { requests: 3, windowMs: 300000 },  // 3/5min
  
  // Payment endpoints
  payment: { requests: 10, windowMs: 60000 },   // 10/min
  
  // Points endpoints
  points: { requests: 30, windowMs: 60000 },    // 30/min
  
  // General API
  api: { requests: 100, windowMs: 60000 },      // 100/min
  
  // Webhooks (higher limit)
  webhook: { requests: 200, windowMs: 60000 },  // 200/min
}

// Get client identifier (IP + optional user ID for logged-in users)
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0]?.trim() || realIP || 'unknown'
  
  // Include user ID if available for per-user rate limiting
  return userId ? `${ip}:${userId}` : ip
}

// Determine rate limit config based on endpoint
export function getRateLimitConfig(pathname: string): RateLimitConfig {
  if (pathname.includes('/swap')) return RATE_LIMIT_CONFIGS.swap
  if (pathname.includes('/decart')) return RATE_LIMIT_CONFIGS.decart
  if (pathname.includes('/fal')) return RATE_LIMIT_CONFIGS.fal
  if (pathname.includes('/runpod')) return RATE_LIMIT_CONFIGS.runpod
  if (pathname.includes('/livekit')) return RATE_LIMIT_CONFIGS.livekit
  if (pathname.includes('/auth') || pathname.includes('/login')) return RATE_LIMIT_CONFIGS.auth
  if (pathname.includes('/payment')) return RATE_LIMIT_CONFIGS.payment
  if (pathname.includes('/points')) return RATE_LIMIT_CONFIGS.points
  if (pathname.includes('/webhook')) return RATE_LIMIT_CONFIGS.webhook
  return RATE_LIMIT_CONFIGS.api
}

// Check rate limit (in-memory version)
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const key = identifier
  
  const record = memoryStore.get(key)
  
  if (!record || now > record.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return {
      success: true,
      remaining: config.requests - 1,
      reset: now + config.windowMs
    }
  }
  
  if (record.count >= config.requests) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime
    }
  }
  
  record.count++
  return {
    success: true,
    remaining: config.requests - record.count,
    reset: record.resetTime
  }
}

// Rate limit response helper
export function rateLimitResponse(reset: number): NextResponse {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000)
  
  return NextResponse.json(
    { 
      error: 'Trop de requetes. Reessaie dans quelques secondes.',
      retryAfter 
    },
    { 
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': reset.toString()
      }
    }
  )
}

// Wrapper function for API routes
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  userId?: string
): Promise<NextResponse> {
  const identifier = getClientIdentifier(request, userId)
  const config = getRateLimitConfig(request.nextUrl.pathname)
  
  const result = await checkRateLimit(`${identifier}:${request.nextUrl.pathname}`, config)
  
  if (!result.success) {
    console.log(`[RateLimit] Blocked: ${identifier} on ${request.nextUrl.pathname}`)
    return rateLimitResponse(result.reset)
  }
  
  const response = await handler()
  
  // Add rate limit headers
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  
  return response
}

// Cleanup old entries periodically (call this in a cron job or worker)
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key)
    }
  }
}

// GPU usage tracking to prevent abuse
const gpuUsageStore = new Map<string, { seconds: number; lastReset: number }>()

export function trackGPUUsage(userId: string, seconds: number): { allowed: boolean; totalUsed: number } {
  const now = Date.now()
  const dailyReset = 24 * 60 * 60 * 1000 // 24 hours
  const maxDailySeconds = 7200 // 2 hours max per user per day (safety limit)
  
  const record = gpuUsageStore.get(userId)
  
  if (!record || now > record.lastReset + dailyReset) {
    gpuUsageStore.set(userId, { seconds, lastReset: now })
    return { allowed: true, totalUsed: seconds }
  }
  
  const newTotal = record.seconds + seconds
  
  if (newTotal > maxDailySeconds) {
    console.log(`[GPU Abuse] User ${userId} exceeded daily limit: ${newTotal}s`)
    return { allowed: false, totalUsed: record.seconds }
  }
  
  record.seconds = newTotal
  return { allowed: true, totalUsed: newTotal }
}
