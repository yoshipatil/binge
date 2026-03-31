// GET /api/movies/featured — returns a random trending movie for the hero backdrop
import { NextRequest, NextResponse } from "next/server"
import { getTrending } from "@/lib/tmdb"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit"

export async function GET(request: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(
    `featured:${getClientIp(request.headers)}`,
    10,
    60_000
  )
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  try {
    const data = await getTrending("movie")
    const withBackdrop = data.results.filter((m) => m.backdrop_path && m.overview)
    const movie = withBackdrop[Math.floor(Math.random() * Math.min(5, withBackdrop.length))]
    return NextResponse.json({ movie: movie ?? null })
  } catch {
    return NextResponse.json({ movie: null })
  }
}
