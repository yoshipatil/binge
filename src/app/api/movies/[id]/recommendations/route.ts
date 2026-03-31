// GET /api/movies/[id]/recommendations?type=movie|tv
import { NextRequest, NextResponse } from "next/server"
import { getMovieRecommendations, getTVRecommendations } from "@/lib/tmdb"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed, retryAfterMs } = checkRateLimit(
    `recommendations:${getClientIp(request.headers)}`,
    60,
    60_000
  )
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const { id } = await params
  const tmdbId = Number(id)
  if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
    return NextResponse.json({ results: [] })
  }

  const type = request.nextUrl.searchParams.get("type") ?? "movie"

  try {
    const data =
      type === "tv"
        ? await getTVRecommendations(tmdbId)
        : await getMovieRecommendations(tmdbId)
    return NextResponse.json(data)
  } catch (err) {
    console.error("TMDB recommendations error:", err)
    return NextResponse.json({ results: [] })
  }
}
