// GET /api/users/suggestions
// Returns up to 10 "You May Know" user suggestions for the authenticated user.
//
// Priority order:
// 1. Friends-of-friends: users followed by people I follow, who I don't follow yet
//    Sorted by mutualCount desc (how many of my friends follow them)
// 2. Taste similarity: users with ≥5 overlapping rated titles (fallback if <10 results)
//
// Response: { id, name, username, image, mutualCount, reason }[]

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

const MAX_RESULTS = 10

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`suggestions:${userId}`, 20, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  // Who I already follow + myself — exclude from results
  const myFollows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const alreadyFollowing = new Set([userId, ...myFollows.map((f) => f.followingId)])
  const myFollowingIds = [...myFollows.map((f) => f.followingId)]

  const suggestions: Map<string, { mutualCount: number; reason: "mutual" | "taste" | "new" }> = new Map()

  // ── 1. Friends-of-friends ──────────────────────────────────────────────────
  if (myFollowingIds.length > 0) {
    const friendsFollows = await prisma.follow.findMany({
      where: { followerId: { in: myFollowingIds } },
      select: { followingId: true },
    })

    for (const { followingId } of friendsFollows) {
      if (alreadyFollowing.has(followingId)) continue
      const existing = suggestions.get(followingId)
      if (existing) {
        existing.mutualCount += 1
      } else {
        suggestions.set(followingId, { mutualCount: 1, reason: "mutual" })
      }
    }
  }

  // Sort by mutual count desc, take top MAX_RESULTS
  const sorted = [...suggestions.entries()]
    .sort((a, b) => b[1].mutualCount - a[1].mutualCount)
    .slice(0, MAX_RESULTS)

  // ── 2. Taste similarity fallback (if still under MAX_RESULTS) ──────────────
  if (sorted.length < MAX_RESULTS) {
    const myRatings = await prisma.rating.findMany({
      where: { userId },
      select: { tmdbId: true, mediaType: true, eloScore: true },
    })

    if (myRatings.length >= 5) {
      const myKeys = new Set(myRatings.map((r) => `${r.tmdbId}:${r.mediaType}`))
      const alreadySuggested = new Set([...alreadyFollowing, ...sorted.map(([id]) => id)])

      // Find all users who rated any of the same titles
      const overlappingRatings = await prisma.rating.findMany({
        where: {
          tmdbId: { in: myRatings.map((r) => r.tmdbId) },
          userId: { notIn: [...alreadySuggested] },
        },
        select: { userId: true, tmdbId: true, mediaType: true },
      })

      const overlapCount = new Map<string, number>()
      for (const r of overlappingRatings) {
        if (!myKeys.has(`${r.tmdbId}:${r.mediaType}`)) continue
        overlapCount.set(r.userId, (overlapCount.get(r.userId) ?? 0) + 1)
      }

      // Only suggest users with ≥5 overlapping titles
      const tasteCandidates = [...overlapCount.entries()]
        .filter(([, count]) => count >= 5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_RESULTS - sorted.length)

      for (const [uid] of tasteCandidates) {
        suggestions.set(uid, { mutualCount: 0, reason: "taste" })
        sorted.push([uid, { mutualCount: 0, reason: "taste" }])
      }
    }
  }

  if (sorted.length === 0) {
    return NextResponse.json([])
  }

  // ── Fetch user details ─────────────────────────────────────────────────────
  const userIds = sorted.map(([id]) => id)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, username: true, image: true },
  })

  const result = sorted
    .map(([id, meta]) => {
      const user = users.find((u) => u.id === id)
      if (!user) return null
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        image: user.image,
        mutualCount: meta.mutualCount,
        reason: meta.reason,
      }
    })
    .filter(Boolean)

  return NextResponse.json(result)
}
