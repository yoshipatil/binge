// POST /api/ratings/compare
// Records "I preferred movie A over movie B" and updates both ELO scores
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateElo } from "@/lib/elo"

const recentComparisons = new Map<string, number>()

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { winnerId, loserId, mediaType } = await request.json()

    if (!winnerId || !loserId || !mediaType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const pairKey = [userId, Math.min(winnerId, loserId), Math.max(winnerId, loserId), mediaType].join(":")
    const lastSeen = recentComparisons.get(pairKey) ?? 0
    const now = Date.now()
    if (now - lastSeen < 300) {
      return NextResponse.json({ error: "Too many comparisons" }, { status: 429 })
    }
    recentComparisons.set(pairKey, now)
    if (recentComparisons.size > 5000) recentComparisons.clear()

    const [winner, loser] = await Promise.all([
      prisma.rating.findUnique({ where: { userId_tmdbId_mediaType: { userId, tmdbId: winnerId, mediaType } } }),
      prisma.rating.findUnique({ where: { userId_tmdbId_mediaType: { userId, tmdbId: loserId, mediaType } } }),
    ])

    if (!winner || !loser) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 })
    }

    if (winner.mediaType !== loser.mediaType) {
      return NextResponse.json({ error: "Media type mismatch" }, { status: 400 })
    }

    const { newWinner, newLoser } = calculateElo(winner.eloScore, loser.eloScore)

    const [updatedWinner, updatedLoser] = await Promise.all([
      prisma.rating.update({ where: { id: winner.id }, data: { eloScore: newWinner } }),
      prisma.rating.update({ where: { id: loser.id }, data: { eloScore: newLoser } }),
    ])

    try {
      await prisma.comparison.create({
        data: { userId, winnerTmdbId: winnerId, loserTmdbId: loserId, mediaType },
      })
    } catch (compErr) {
      await Promise.all([
        prisma.rating.update({ where: { id: winner.id }, data: { eloScore: winner.eloScore } }),
        prisma.rating.update({ where: { id: loser.id }, data: { eloScore: loser.eloScore } }),
      ]).catch(() => {})
      console.error("Comparison record failed, ELO rolled back:", compErr)
      return NextResponse.json({ error: "Failed to record comparison" }, { status: 500 })
    }

    return NextResponse.json({ winner: updatedWinner, loser: updatedLoser })
  } catch (err) {
    console.error("Comparison error:", err)
    return NextResponse.json({ error: "Failed to record comparison" }, { status: 500 })
  }
}
