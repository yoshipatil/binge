// GET  /api/ratings          — all your ratings with normalized display scores
// POST /api/ratings          — rate a new movie (or update existing)
// DELETE /api/ratings?tmdbId=&mediaType= — remove a rating
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { seedEloFromScore, normalizeEloScores, pickComparisonCandidates } from "@/lib/elo"

export async function GET() {
  try {
    const ratings = await prisma.rating.findMany({
      orderBy: { eloScore: "desc" },
    })

    // Group by mediaType, normalize ELO within each group
    const grouped: Record<string, typeof ratings> = {}
    ratings.forEach((r) => {
      if (!grouped[r.mediaType]) grouped[r.mediaType] = []
      grouped[r.mediaType].push(r)
    })

    const normalized = Object.entries(grouped).flatMap(([, group]) =>
      normalizeEloScores(group)
    )

    return NextResponse.json(normalized)
  } catch (err) {
    console.error("Ratings fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch ratings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tmdbId, mediaType, seedScore, review } = body

    if (!tmdbId || !mediaType || seedScore === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const clampedScore = Math.max(1, Math.min(10, seedScore))
    const roundedScore = Math.round(clampedScore * 10) / 10
    const eloScore = seedEloFromScore(roundedScore)

    const rating = await prisma.rating.upsert({
      where: { tmdbId_mediaType: { tmdbId: Number(tmdbId), mediaType } },
      update: { seedScore: roundedScore, review: review ?? null, updatedAt: new Date() },
      create: {
        tmdbId: Number(tmdbId),
        mediaType,
        seedScore: roundedScore,
        eloScore,
        review: review ?? null,
      },
    })

    // Get all existing ratings for this media type to pick comparison candidates
    const existing = await prisma.rating.findMany({
      where: { mediaType, NOT: { tmdbId: Number(tmdbId) } },
      select: { tmdbId: true, eloScore: true },
    })

    const candidateIds = pickComparisonCandidates(eloScore, existing)

    return NextResponse.json({ rating, candidateIds })
  } catch (err) {
    console.error("Rating save error:", err)
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tmdbId = request.nextUrl.searchParams.get("tmdbId")
    const mediaType = request.nextUrl.searchParams.get("mediaType")

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "Missing tmdbId or mediaType" }, { status: 400 })
    }

    await prisma.rating.delete({
      where: { tmdbId_mediaType: { tmdbId: Number(tmdbId), mediaType } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Rating delete error:", err)
    return NextResponse.json({ error: "Failed to delete rating" }, { status: 500 })
  }
}
