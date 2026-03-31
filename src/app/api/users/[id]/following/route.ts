import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit"

// GET /api/users/[id]/following
// Returns list of users that the given user follows, with isFollowing status for current user
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { allowed, retryAfterMs } = checkRateLimit(
    `following:${getClientIp(req.headers)}`,
    30,
    60_000
  )
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const session = await auth()
  const currentUserId = session?.user?.id ?? ""
  const { id } = await params

  if (!id || id.length > 128) {
    return NextResponse.json({ users: [] })
  }

  const follows = await prisma.follow.findMany({
    where: { followerId: id },
    select: { followingId: true },
  })

  if (follows.length === 0) return NextResponse.json({ users: [] })

  const followingIds = follows.map((f) => f.followingId)

  const [users, myFollowing] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: followingIds } },
      select: { id: true, name: true, image: true, username: true },
    }),
    currentUserId
      ? prisma.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        })
      : Promise.resolve([]),
  ])

  const followingSet = new Set((myFollowing as { followingId: string }[]).map((f) => f.followingId))

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      isFollowing: followingSet.has(u.id),
      isSelf: u.id === currentUserId,
    })),
  })
}
