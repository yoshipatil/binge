// GET /api/friends/activity
// Returns the 20 most recent ratings by users the current user follows,
// enriched with the rater's name/image from our User table.
import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const followingIds = (
    await prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    })
  ).map((f) => f.followingId)

  if (followingIds.length === 0) {
    return NextResponse.json({ activity: [] })
  }

  // Fetch 20 most recent ratings from followed users
  const recentRatings = await prisma.rating.findMany({
    where: { userId: { in: followingIds } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, userId: true, tmdbId: true, mediaType: true, eloScore: true, createdAt: true },
  })

  if (recentRatings.length === 0) {
    return NextResponse.json({ activity: [] })
  }

  // Fetch User profiles for raters (single query)
  const raterIds = [...new Set(recentRatings.map((r) => r.userId))]
  const users = await prisma.user.findMany({
    where: { id: { in: raterIds } },
    select: { id: true, name: true, image: true },
  })
  const userMap = new Map(users.map((u) => [u.id, u]))

  // Compute per-user display scores so we show the normalized 0–10 score
  const allRaterRatings = await prisma.rating.findMany({
    where: { userId: { in: raterIds } },
    select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
  })

  // Group by userId + mediaType, normalize, build a lookup map
  type ScoreKey = string // `${userId}:${tmdbId}:${mediaType}`
  const displayScoreMap = new Map<ScoreKey, number>()

  const grouped = new Map<string, typeof allRaterRatings>()
  for (const r of allRaterRatings) {
    const key = `${r.userId}:${r.mediaType}`
    const arr = grouped.get(key) ?? []
    arr.push(r)
    grouped.set(key, arr)
  }
  for (const [, ratings] of grouped) {
    const normalized = normalizeEloScores(ratings)
    for (const n of normalized) {
      displayScoreMap.set(`${n.userId}:${n.tmdbId}:${n.mediaType}`, n.displayScore)
    }
  }

  const activity = recentRatings.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: userMap.get(r.userId)?.name ?? null,
    userImage: userMap.get(r.userId)?.image ?? null,
    tmdbId: r.tmdbId,
    mediaType: r.mediaType,
    displayScore: displayScoreMap.get(`${r.userId}:${r.tmdbId}:${r.mediaType}`) ?? null,
    createdAt: r.createdAt,
  }))

  return NextResponse.json({ activity })
}
