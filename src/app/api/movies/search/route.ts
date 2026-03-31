// GET /api/movies/search?q=inception&type=all
// Proxies TMDB multi-search and labels each result with our MediaType
import { NextRequest, NextResponse } from "next/server"
import { searchMulti } from "@/lib/tmdb"
import { getMediaType } from "@/types"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit"

export async function GET(request: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(
    `search:${getClientIp(request.headers)}`,
    20,
    60_000
  )
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const q = request.nextUrl.searchParams.get("q")
  if (!q || q.trim().length === 0) {
    return NextResponse.json({ results: [] })
  }
  if (q.trim().length > 200) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 })
  }

  try {
    const data = await searchMulti(q.trim())

    // Filter out people, keep only movies and TV shows
    const results = data.results
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .map((r) => ({
        ...r,
        appMediaType: getMediaType(r), // our classification (movie/tv/documentary)
      }))

    return NextResponse.json({ results, total_results: results.length })
  } catch (err) {
    console.error("TMDB search error:", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
