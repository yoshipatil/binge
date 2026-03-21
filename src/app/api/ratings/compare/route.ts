// POST /api/ratings/compare
// Records "I preferred movie A over movie B" and updates both ELO scores
// Body: { winnerId: number, loserId: number, mediaType: string }
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateElo } from "@/lib/elo"

export async function POST(request: NextRequest) {
  try {
    const { winnerId, loserId, mediaType } = await request.json()

    if (!winnerId || !loserId || !mediaType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const [winner, loser] = await Promise.all([
      prisma.rating.findUnique({ where: { tmdbId_mediaType: { tmdbId: winnerId, mediaType } } }),
      prisma.rating.findUnique({ where: { tmdbId_mediaType: { tmdbId: loserId, mediaType } } }),
    ])

    if (!winner || !loser) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 })
    }

    const { newWinner, newLoser } = calculateElo(winner.eloScore, loser.eloScore)

    // Update both ELO scores and save the comparison record atomically
    const [updatedWinner, updatedLoser] = await prisma.$transaction([
      prisma.rating.update({
        where: { id: winner.id },
        data: { eloScore: newWinner },
      }),
      prisma.rating.update({
        where: { id: loser.id },
        data: { eloScore: newLoser },
      }),
      prisma.comparison.create({
        data: { winnerTmdbId: winnerId, loserTmdbId: loserId, mediaType },
      }),
    ])

    return NextResponse.json({ winner: updatedWinner, loser: updatedLoser })
  } catch (err) {
    console.error("Comparison error:", err)
    return NextResponse.json({ error: "Failed to record comparison" }, { status: 500 })
  }
}
