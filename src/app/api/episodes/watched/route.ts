// GET    /api/episodes/watched?showId=123
//   → returns all watched episodes for a show + per-season progress summary
// POST   /api/episodes/watched
//   → mark an episode watched  { showTmdbId, seasonNum, episodeNum }
// DELETE /api/episodes/watched?showId=123&seasonNum=1&episodeNum=5
//   → unmark an episode as watched

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`episodes-get:${userId}`, 60, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const showId = Number(request.nextUrl.searchParams.get("showId"))
  if (!Number.isSafeInteger(showId) || showId <= 0) {
    return NextResponse.json({ error: "Invalid showId" }, { status: 400 })
  }

  try {
    const watched = await prisma.watchedEpisode.findMany({
      where: { userId, showTmdbId: showId },
      select: { seasonNum: true, episodeNum: true, watchedAt: true },
      orderBy: [{ seasonNum: "asc" }, { episodeNum: "asc" }],
    })

    // Build per-season watched count map
    const perSeason: Record<number, number> = {}
    for (const ep of watched) {
      perSeason[ep.seasonNum] = (perSeason[ep.seasonNum] ?? 0) + 1
    }

    return NextResponse.json({ watched, perSeason })
  } catch (err) {
    console.error("Episodes watched fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch watched episodes" }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  // 120/min — users may bulk-mark whole seasons
  const { allowed, retryAfterMs } = checkRateLimit(`episodes-post:${userId}`, 120, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  try {
    const body = await request.json()

    const showTmdbId = Number(body.showTmdbId)
    if (!Number.isSafeInteger(showTmdbId) || showTmdbId <= 0) {
      return NextResponse.json({ error: "Invalid showTmdbId" }, { status: 400 })
    }
    const seasonNum = Number(body.seasonNum)
    if (!Number.isSafeInteger(seasonNum) || seasonNum < 0) {
      return NextResponse.json({ error: "Invalid seasonNum" }, { status: 400 })
    }
    const episodeNum = Number(body.episodeNum)
    if (!Number.isSafeInteger(episodeNum) || episodeNum <= 0) {
      return NextResponse.json({ error: "Invalid episodeNum" }, { status: 400 })
    }

    // Neon HTTP adapter: no upsert — manual find+create
    const existing = await prisma.watchedEpisode.findUnique({
      where: {
        userId_showTmdbId_seasonNum_episodeNum: { userId, showTmdbId, seasonNum, episodeNum },
      },
    })
    const episode = existing ?? await prisma.watchedEpisode.create({
      data: { userId, showTmdbId, seasonNum, episodeNum },
    })

    return NextResponse.json(episode)
  } catch (err) {
    console.error("Episode mark watched error:", err)
    return NextResponse.json({ error: "Failed to mark episode watched" }, { status: 500 })
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`episodes-delete:${userId}`, 120, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  try {
    const showId = Number(request.nextUrl.searchParams.get("showId"))
    const seasonNum = Number(request.nextUrl.searchParams.get("seasonNum"))
    const episodeNum = Number(request.nextUrl.searchParams.get("episodeNum"))

    if (!Number.isSafeInteger(showId) || showId <= 0) {
      return NextResponse.json({ error: "Invalid showId" }, { status: 400 })
    }
    if (!Number.isSafeInteger(seasonNum) || seasonNum < 0) {
      return NextResponse.json({ error: "Invalid seasonNum" }, { status: 400 })
    }
    if (!Number.isSafeInteger(episodeNum) || episodeNum <= 0) {
      return NextResponse.json({ error: "Invalid episodeNum" }, { status: 400 })
    }

    await prisma.watchedEpisode.delete({
      where: {
        userId_showTmdbId_seasonNum_episodeNum: {
          userId,
          showTmdbId: showId,
          seasonNum,
          episodeNum,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Episode unmark error:", err)
    return NextResponse.json({ error: "Failed to unmark episode" }, { status: 500 })
  }
}
