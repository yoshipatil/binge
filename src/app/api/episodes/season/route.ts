// GET /api/episodes/season?showId=123&season=1
// TMDB season proxy — returns episode list for a season.
// Cached 1hr via Next.js ISR (TMDB data is stable).
// Auth required — prevents unauthenticated TMDB key usage.

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getTVSeasonDetails } from "@/lib/tmdb"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  // 30/min — each season request fans out to TMDB, keep this conservative
  const { allowed, retryAfterMs } = checkRateLimit(`episodes-season:${userId}`, 30, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const showId = Number(request.nextUrl.searchParams.get("showId"))
  const season = Number(request.nextUrl.searchParams.get("season"))

  if (!Number.isSafeInteger(showId) || showId <= 0) {
    return NextResponse.json({ error: "Invalid showId" }, { status: 400 })
  }
  if (!Number.isSafeInteger(season) || season < 0) {
    return NextResponse.json({ error: "Invalid season" }, { status: 400 })
  }

  try {
    const data = await getTVSeasonDetails(showId, season)
    return NextResponse.json(data)
  } catch (err) {
    console.error("Season details fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch season details" }, { status: 500 })
  }
}
