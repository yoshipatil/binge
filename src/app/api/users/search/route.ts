import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// GET /api/users/search?q=name_or_username
// Returns users matching by name or @username, excludes current user.
// Also returns isFollowing per result so the UI can show correct button state.
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) {
    return NextResponse.json({ users: [] })
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
              { email: { contains: cleaned, mode: "insensitive" } },
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
