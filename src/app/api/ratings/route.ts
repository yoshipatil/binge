// GET    /api/ratings          — your ratings with normalized display scores
// POST   /api/ratings          — rate a new movie (or update existing)
// DELETE /api/ratings?tmdbId=&mediaType= — remove a rating
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { seedEloFromScore, normalizeEloScores, pickComparisonCandidates } from "@/lib/elo"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"
import { syncUser } from "@/lib/syncUser"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

const VALID_MEDIA_TYPES = ["movie", "tv", "documentary"] as const
type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number]

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`ratings-get:${userId}`, 30, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  // Lazy sync — fire-and-forget so existing users get a User record
  // without having to sign out and back in. Doesn't block the response.
  syncUser(session.user as Parameters<typeof syncUser>[0])

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
  const { allowed, retryAfterMs } = checkRateLimit(`ratings-post:${userId}`, 60, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  try {
    const body = await request.json()

    // --- Input validation ---
    const tmdbId = Number(body.tmdbId)
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 })
    }

    if (!VALID_MEDIA_TYPES.includes(body.mediaType)) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 })
    }
    const mediaType = body.mediaType as ValidMediaType

    const seedScore = Number(body.seedScore)
    if (!Number.isFinite(seedScore) || seedScore < 1 || seedScore > 10) {
      return NextResponse.json({ error: "seedScore must be between 1 and 10" }, { status: 400 })
    }

    let review: string | null = null
    if (body.review !== undefined && body.review !== null) {
      if (typeof body.review !== "string") {
        return NextResponse.json({ error: "review must be a string" }, { status: 400 })
      }
      if (body.review.length > 500) {
        return NextResponse.json({ error: "review must be 500 characters or less" }, { status: 400 })
      }
      review = body.review
    }
    // --- End validation ---

    const clampedScore = Math.max(1, Math.min(10, seedScore))
    const roundedScore = Math.round(clampedScore * 10) / 10
    const eloScore = seedEloFromScore(roundedScore)

    // Neon HTTP adapter doesn't support transactions, so avoid upsert
    const existingRating = await prisma.rating.findUnique({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    })
    const rating = existingRating
      ? await prisma.rating.update({
          where: { id: existingRating.id },
          data: { seedScore: roundedScore, eloScore, review, updatedAt: new Date() },
        })
      : await prisma.rating.create({
          data: { userId, tmdbId, mediaType, seedScore: roundedScore, eloScore, review },
        })

    const [existing, priorComparisons] = await Promise.all([
      prisma.rating.findMany({
        where: { userId, mediaType, NOT: { tmdbId } },
        select: { tmdbId: true, eloScore: true },
      }),
      prisma.comparison.findMany({
        where: {
          userId,
          mediaType,
          OR: [{ winnerTmdbId: tmdbId }, { loserTmdbId: tmdbId }],
        },
        select: { winnerTmdbId: true, loserTmdbId: true },
      }),
    ])

    const alreadyComparedIds = priorComparisons.map((c) =>
      c.winnerTmdbId === tmdbId ? c.loserTmdbId : c.winnerTmdbId
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
  const { allowed, retryAfterMs } = checkRateLimit(`ratings-delete:${userId}`, 30, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  try {
    const tmdbId = Number(request.nextUrl.searchParams.get("tmdbId"))
    const mediaType = request.nextUrl.searchParams.get("mediaType")

    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 })
    }
    if (!mediaType || !VALID_MEDIA_TYPES.includes(mediaType as ValidMediaType)) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 })
    }

    await prisma.rating.delete({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Rating delete error:", err)
    return NextResponse.json({ error: "Failed to delete rating" }, { status: 500 })
  }
}
