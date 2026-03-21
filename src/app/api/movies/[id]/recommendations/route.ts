// GET /api/movies/[id]/recommendations?type=movie|tv
import { NextRequest, NextResponse } from "next/server"
import { getMovieRecommendations, getTVRecommendations } from "@/lib/tmdb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const type = request.nextUrl.searchParams.get("type") ?? "movie"

  try {
    const data =
      type === "tv"
        ? await getTVRecommendations(Number(id))
        : await getMovieRecommendations(Number(id))
    return NextResponse.json(data)
  } catch (err) {
    console.error("TMDB recommendations error:", err)
    return NextResponse.json({ results: [] })
  }
}
