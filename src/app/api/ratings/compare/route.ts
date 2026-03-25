// POST /api/ratings/compare
// Records "I preferred movie A over movie B" and updates both ELO scores
// Body: { winnerId: number, loserId: number, mediaType: string }
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateElo } from "@/lib/elo"

// Simple in-memory rate limiter: max 1 comparison per 300ms per movie pair
const recentComparisons = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    const { winnerId, loserId, mediaType } = await request.json()

    if (!winnerId || !loserId || !mediaType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Rate limit: prevent the same pair from being submitted more than once per 300ms
    const pairKey = [Math.min(winnerId, loserId), Math.max(winnerId, loserId), mediaType].join(":")
    const lastSeen = recentComparisons.get(pairKey) ?? 0
    const now = Date.now()
    if (now - lastSeen < 300) {
      return NextResponse.json({ error: "Too many comparisons" }, { status: 429 })
    }
    recentComparisons.set(pairKey, now)
    // Prevent unbounded memory growth
    if (recentComparisons.size > 5000) recentComparisons.clear()

    const [winner, loser] = await Promise.all([
      prisma.rating.findUnique({ where: { tmdbId_mediaType: { tmdbId: winnerId, mediaType } } }),
      prisma.rating.findUnique({ where: { tmdbId_mediaType: { tmdbId: loserId, mediaType } } }),
    ])

    if (!winner || !loser) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 })
    }

    // Validate both ratings are the same media type (guards against client sending mismatched data)
    if (winner.mediaType !== loser.mediaType) {
      return NextResponse.json({ error: "Media type mismatch" }, { status: 400 })
    }

    const { newWinner, newLoser } = calculateElo(winner.eloScore, loser.eloScore)

    // Update both ELO scores in parallel
    // (Neon HTTP adapter does not support $transaction — manual rollback on failure below)
    const [updatedWinner, updatedLoser] = await Promise.all([
      prisma.rating.update({ where: { id: winner.id }, data: { eloScore: newWinner } }),
      prisma.rating.update({ where: { id: loser.id }, data: { eloScore: newLoser } }),
    ])

    // Record the comparison — if this fails, roll back both ELO scores
    try {
      await prisma.comparison.create({
        data: { winnerTmdbId: winnerId, loserTmdbId: loserId, mediaType },
      })
    } catch (compErr) {
      // Roll back ELO to original values so DB stays consistent
      await Promise.all([
        prisma.rating.update({ where: { id: winner.id }, data: { eloScore: winner.eloScore } }),
        prisma.rating.update({ where: { id: loser.id }, data: { eloScore: loser.eloScore } }),
      ]).catch(() => {/* best-effort rollback */})
      console.error("Comparison record failed, ELO rolled back:", compErr)
      return NextResponse.json({ error: "Failed to record comparison" }, { status: 500 })
    }

    return NextResponse.json({ winner: updatedWinner, loser: updatedLoser })
  } catch (err) {
    console.error("Comparison error:", err)
    return NextResponse.json({ error: "Failed to record comparison" }, { status: 500 })
  }
}
