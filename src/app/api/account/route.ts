import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/account — permanently deletes all data for the signed-in user
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  // Delete all user data in parallel; order doesn't matter since there are no FK constraints
  await Promise.all([
    prisma.rating.deleteMany({ where: { userId } }),
    prisma.watchlist.deleteMany({ where: { userId } }),
    prisma.comparison.deleteMany({ where: { userId } }),
  ])

  return NextResponse.json({ ok: true })
}
