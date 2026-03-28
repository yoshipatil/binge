// GET /api/friends/trending
// Returns the top 10 titles rated by friends in the last 30 days,
// ranked by average display score. Aggregate only — no individual names.
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
    return NextResponse.json({ trending: [] })
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Ratings from followed users in the last 30 days
  const recentRatings = await prisma.rating.findMany({
    where: { userId: { in: followingIds }, createdAt: { gte: since } },
    select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
  })

  if (recentRatings.length === 0) {
    return NextResponse.json({ trending: [] })
  }

  // Normalize per-user and build display score lookup
  const raterIds = [...new Set(recentRatings.map((r) => r.userId))]
  const allRaterRatings = await prisma.rating.findMany({
    where: { userId: { in: raterIds } },
    select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
  })

  type ScoreKey = string
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

  // Group recent ratings by title, average display scores
  const titleMap = new Map<string, { tmdbId: number; mediaType: string; scores: number[]; raterCount: number }>()
  for (const r of recentRatings) {
    const key = `${r.tmdbId}:${r.mediaType}`
    const score = displayScoreMap.get(`${r.userId}:${r.tmdbId}:${r.mediaType}`)
    if (score == null) continue
    const entry = titleMap.get(key) ?? { tmdbId: r.tmdbId, mediaType: r.mediaType, scores: [], raterCount: 0 }
    entry.scores.push(score)
    entry.raterCount++
    titleMap.set(key, entry)
  }

  const trending = [...titleMap.values()]
    .map((entry) => ({
      tmdbId: entry.tmdbId,
      mediaType: entry.mediaType,
      avgScore: Math.round((entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length) * 10) / 10,
      raterCount: entry.raterCount,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)

  return NextResponse.json({ trending })
}
