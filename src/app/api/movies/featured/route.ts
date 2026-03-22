// GET /api/movies/featured — returns a random trending movie for the hero backdrop
import { NextResponse } from "next/server"
import { getTrending } from "@/lib/tmdb"

export async function GET() {
  try {
    const data = await getTrending("movie")
    const withBackdrop = data.results.filter((m) => m.backdrop_path && m.overview)
    const movie = withBackdrop[Math.floor(Math.random() * Math.min(5, withBackdrop.length))]
    return NextResponse.json({ movie: movie ?? null })
  } catch {
    return NextResponse.json({ movie: null })
  }
}
