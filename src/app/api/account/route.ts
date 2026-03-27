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

  try {
    // Delete all user data; no FK constraints so order doesn't matter
    await prisma.rating.deleteMany({ where: { userId } })
    await prisma.watchlist.deleteMany({ where: { userId } })
    await prisma.comparison.deleteMany({ where: { userId } })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Account deletion error:", err)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
