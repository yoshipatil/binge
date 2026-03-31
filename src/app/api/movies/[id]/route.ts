// GET /api/movies/[id]?type=movie|tv
import { NextRequest, NextResponse } from "next/server"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed, retryAfterMs } = checkRateLimit(
    `movie-detail:${getClientIp(request.headers)}`,
    60,
    60_000
  )
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const { id } = await params
  const tmdbId = Number(id)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 })
  }

  const type = request.nextUrl.searchParams.get("type") ?? "movie"

  try {
    const data = type === "tv" ? await getTVDetails(tmdbId) : await getMovieDetails(tmdbId)
    return NextResponse.json(data)
  } catch (err) {
    console.error("TMDB movie fetch error:", err)
    return NextResponse.json({ error: "Movie not found" }, { status: 404 })
  }
}
