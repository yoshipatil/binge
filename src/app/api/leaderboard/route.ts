// GET /api/leaderboard
// Returns friends-only leaderboard data:
// - mostCompared: top 5 users (by follow graph) who have done the most head-to-head comparisons
// - boldRankers: top 5 users whose rankings diverge most from the group average
//
// Only includes people you follow + yourself.

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`leaderboard:${userId}`, 20, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  // Get IDs of everyone you follow + yourself
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const friendIds = [userId, ...follows.map((f) => f.followingId)]

  // ── Most Compared ─────────────────────────────────────────────────────────
  // Count comparisons per user within the friend group
  const comparisonCounts = await prisma.comparison.groupBy({
    by: ["userId"],
    where: { userId: { in: friendIds } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  })

  const topComparers = comparisonCounts.slice(0, 5)
  const topComparerIds = topComparers.map((c) => c.userId)

  const comparerUsers = await prisma.user.findMany({
    where: { id: { in: topComparerIds } },
    select: { id: true, name: true, username: true, image: true },
  })

  const mostCompared = topComparers
    .map((c) => {
      const user = comparerUsers.find((u) => u.id === c.userId)
      if (!user) return null
      return {
        user,
        comparisons: c._count.id,
        isCurrentUser: c.userId === userId,
      }
    })
    .filter(Boolean)

  // ── Bold Rankers ──────────────────────────────────────────────────────────
  // Bold = biggest average divergence from the group's average score per title.
  // Only computed for users who have rated ≥5 items.
  const allRatings = await prisma.rating.findMany({
    where: { userId: { in: friendIds } },
    select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
  })

  // Build per-user normalized scores
  const ratingsByUser = new Map<string, typeof allRatings>()
  for (const r of allRatings) {
    if (!ratingsByUser.has(r.userId)) ratingsByUser.set(r.userId, [])
    ratingsByUser.get(r.userId)!.push(r)
  }

  // Build group average score per title (key = tmdbId:mediaType)
  const titleScores = new Map<string, number[]>()
  for (const [uid, ratings] of ratingsByUser) {
    const normalized = normalizeEloScores(ratings.map(r => ({ ...r, userId: uid })))
    for (const r of normalized) {
      const key = `${r.tmdbId}:${r.mediaType}`
      if (!titleScores.has(key)) titleScores.set(key, [])
      titleScores.get(key)!.push(r.displayScore)
    }
  }

  const groupAvg = new Map<string, number>()
  for (const [key, scores] of titleScores) {
    if (scores.length >= 2) {
      groupAvg.set(key, scores.reduce((a, b) => a + b, 0) / scores.length)
    }
  }

  // Score each user's boldness
  const boldnessScores: { userId: string; boldness: number; divergences: number }[] = []
  for (const [uid, ratings] of ratingsByUser) {
    if (ratings.length < 5) continue
    const normalized = normalizeEloScores(ratings.map(r => ({ ...r, userId: uid })))
    const diffs: number[] = []
    for (const r of normalized) {
      const key = `${r.tmdbId}:${r.mediaType}`
      const avg = groupAvg.get(key)
      if (avg !== undefined) {
        diffs.push(Math.abs(r.displayScore - avg))
      }
    }
    if (diffs.length < 3) continue
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
    boldnessScores.push({ userId: uid, boldness: Math.round(avgDiff * 10) / 10, divergences: diffs.length })
  }

  boldnessScores.sort((a, b) => b.boldness - a.boldness)
  const top5Bold = boldnessScores.slice(0, 5)
  const boldUserIds = top5Bold.map((b) => b.userId)

  const boldUsers = await prisma.user.findMany({
    where: { id: { in: boldUserIds } },
    select: { id: true, name: true, username: true, image: true },
  })

  const boldRankers = top5Bold
    .map((b) => {
      const user = boldUsers.find((u) => u.id === b.userId)
      if (!user) return null
      return {
        user,
        boldness: b.boldness,
        divergences: b.divergences,
        isCurrentUser: b.userId === userId,
      }
    })
    .filter(Boolean)

  return NextResponse.json({ mostCompared, boldRankers })
}
