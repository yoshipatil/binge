import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

// GET /api/users/search?q=name_or_username
// Returns users matching by name or @username, excludes current user.
// Also returns isFollowing per result so the UI can show correct button state.
// NOTE: email is intentionally excluded from search — it is PII and users
// should not be discoverable by their private email address.
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { allowed, retryAfterMs } = checkRateLimit(`users-search:${session.user.id}`, 20, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ users: [] })
  }
  if (q.length > 100) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 })
  }

  // Strip leading @ for username search
  const cleaned = q.startsWith("@") ? q.slice(1) : q

  const [users, following] = await Promise.all([
    prisma.user.findMany({
      where: {
        AND: [
          { id: { not: session.user.id } },
          {
            OR: [
              { name: { contains: cleaned, mode: "insensitive" } },
              { username: { contains: cleaned, mode: "insensitive" } },
              // email intentionally omitted — PII, not for social discovery
            ],
          },
        ],
      },
      select: { id: true, name: true, image: true, username: true },
      take: 20,
    }),
    prisma.follow.findMany({
      where: { followerId: session.user.id },
      select: { followingId: true },
    }),
  ])

  const followingSet = new Set(following.map((f) => f.followingId))

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      isFollowing: followingSet.has(u.id),
    })),
  })
}
