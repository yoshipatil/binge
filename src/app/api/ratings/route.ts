// GET    /api/ratings          — your ratings with normalized display scores
// POST   /api/ratings          — rate a new movie (or update existing)
// DELETE /api/ratings?tmdbId=&mediaType= — remove a rating
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { seedEloFromScore, normalizeEloScores, pickComparisonCandidates } from "@/lib/elo"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const ratings = await prisma.rating.findMany({
      where: { userId },
      orderBy: { eloScore: "desc" },
    })

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
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

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
      where: { userId_tmdbId_mediaType: { userId, tmdbId: Number(tmdbId), mediaType } },
      update: { seedScore: roundedScore, eloScore, review: review ?? null, updatedAt: new Date() },
      create: {
        userId,
        tmdbId: Number(tmdbId),
        mediaType,
        seedScore: roundedScore,
        eloScore,
        review: review ?? null,
      },
    })

    const [existing, priorComparisons] = await Promise.all([
      prisma.rating.findMany({
        where: { userId, mediaType, NOT: { tmdbId: Number(tmdbId) } },
        select: { tmdbId: true, eloScore: true },
      }),
      prisma.comparison.findMany({
        where: {
          userId,
          mediaType,
          OR: [{ winnerTmdbId: Number(tmdbId) }, { loserTmdbId: Number(tmdbId) }],
        },
        select: { winnerTmdbId: true, loserTmdbId: true },
      }),
    ])

    const alreadyComparedIds = priorComparisons.map((c) =>
      c.winnerTmdbId === Number(tmdbId) ? c.loserTmdbId : c.winnerTmdbId
    )

    const candidateIds = pickComparisonCandidates(eloScore, existing, 4, alreadyComparedIds)

    const candidates = await Promise.all(
      candidateIds.map((id) =>
        (mediaType === "tv" ? getTVDetails(id) : getMovieDetails(id)).catch(() => null)
      )
    ).then((results) => results.filter(Boolean))

    return NextResponse.json({ rating, candidateIds, candidates })
  } catch (err) {
    console.error("Rating save error:", err)
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const tmdbId = request.nextUrl.searchParams.get("tmdbId")
    const mediaType = request.nextUrl.searchParams.get("mediaType")

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "Missing tmdbId or mediaType" }, { status: 400 })
    }

    await prisma.rating.delete({
      where: { userId_tmdbId_mediaType: { userId, tmdbId: Number(tmdbId), mediaType } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Rating delete error:", err)
    return NextResponse.json({ error: "Failed to delete rating" }, { status: 500 })
  }
}
