/**
 * Simple sliding-window rate limiter backed by an in-memory Map.
 * Best-effort on Vercel serverless (resets on cold start) — no Redis required.
 * Good enough to block abuse; not a hard guarantee across concurrent instances.
 */

const windows = new Map<string, { count: number; resetAt: number }>()
let lastCleanup = Date.now()

function maybeCleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  for (const [key, entry] of windows) {
    if (now >= entry.resetAt) windows.delete(key)
  }
  lastCleanup = now
}

/**
 * Check whether the given key is within the rate limit.
 * @param key      - unique identifier (e.g. "ip:1.2.3.4" or "user:abc123")
 * @param limit    - max requests allowed in the window
 * @param windowMs - window duration in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterMs: number } {
  maybeCleanup()
  const now = Date.now()
  const entry = windows.get(key)

  if (!entry || now >= entry.resetAt) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= limit) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0 }
}

/** Extract client IP from the x-forwarded-for header (set by Vercel). */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return "unknown"
}

/** Build a standard 429 response with a Retry-After header. */
export function rateLimitedResponse(retryAfterMs: number): Response {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
    },
  })
}
