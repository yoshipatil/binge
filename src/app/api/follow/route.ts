import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/follow?userId=xxx
// Returns follower/following counts and whether the current user follows them
export async function GET(request: NextRequest) {
  const session = await auth()
  const targetId = request.nextUrl.searchParams.get("userId")

  if (!targetId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const [followersCount, followingCount, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetId } }),
    prisma.follow.count({ where: { followerId: targetId } }),
    session?.user?.id
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: targetId,
            },
          },
        })
      : null,
  ])

  return NextResponse.json({
    followersCount,
    followingCount,
    isFollowing: !!isFollowing,
  })
}

// POST /api/follow — follow a user { followingId }
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const followingId = String(body.followingId ?? "").trim()

  if (!followingId) {
    return NextResponse.json({ error: "Missing followingId" }, { status: 400 })
  }
  if (followingId === session.user.id) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 })
  }

  // Verify the target user exists in our User table
  const target = await prisma.user.findUnique({ where: { id: followingId } })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Neon HTTP adapter doesn't support transactions — use find + create
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.user.id,
        followingId,
      },
    },
  })

  if (existing) {
    return NextResponse.json({ alreadyFollowing: true })
  }

  const follow = await prisma.follow.create({
    data: { followerId: session.user.id, followingId },
  })

  return NextResponse.json(follow)
}

// DELETE /api/follow?followingId=xxx — unfollow a user
export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const followingId = request.nextUrl.searchParams.get("followingId") ?? ""
  if (!followingId) {
    return NextResponse.json({ error: "Missing followingId" }, { status: 400 })
  }

  await prisma.follow.deleteMany({
    where: { followerId: session.user.id, followingId },
  })

  return NextResponse.json({ unfollowed: true })
}
