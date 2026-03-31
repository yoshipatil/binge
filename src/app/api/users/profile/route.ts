import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

// PATCH /api/users/profile — update own username + bio
export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { allowed, retryAfterMs } = checkRateLimit(`profile-patch:${session.user.id}`, 10, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const body = await request.json()
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : undefined
  const bio = typeof body.bio === "string" ? body.bio.trim().slice(0, 160) : undefined

  // Validate username format: 3-20 chars, alphanumeric + underscores only
  if (username !== undefined) {
    if (username.length < 3 || username.length > 20) {
      return NextResponse.json({ error: "Username must be 3–20 characters" }, { status: 400 })
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores" }, { status: 400 })
    }

    // Check uniqueness — exclude current user
    const existing = await prisma.user.findFirst({
      where: { username, id: { not: session.user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
    },
    select: { id: true, name: true, username: true, bio: true, image: true },
  })

  return NextResponse.json({ user: updated })
}
