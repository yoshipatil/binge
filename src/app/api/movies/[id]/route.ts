// GET /api/movies/[id]?type=movie|tv
import { NextRequest, NextResponse } from "next/server"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const type = request.nextUrl.searchParams.get("type") ?? "movie"

  try {
    const data = type === "tv" ? await getTVDetails(Number(id)) : await getMovieDetails(Number(id))
    return NextResponse.json(data)
  } catch (err) {
    console.error("TMDB movie fetch error:", err)
    return NextResponse.json({ error: "Movie not found" }, { status: 404 })
  }
}
