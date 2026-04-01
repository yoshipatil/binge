// GET /api/compare/count
// Returns total comparison count for the authenticated user.
// Used by the frontend to trigger the ranking reveal animation at 25 comparisons.

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`compare-count:${userId}`, 30, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const total = await prisma.comparison.count({ where: { userId } })

  return NextResponse.json({ total })
}
