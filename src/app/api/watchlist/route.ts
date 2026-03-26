// GET    /api/watchlist              — your watchlist items
// POST   /api/watchlist              — add to watchlist { tmdbId, mediaType }
// DELETE /api/watchlist?tmdbId=&mediaType= — remove from watchlist
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const items = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: "desc" },
    })
    return NextResponse.json(items)
  } catch (err) {
    console.error("Watchlist fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const { tmdbId, mediaType } = await request.json()

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "Missing tmdbId or mediaType" }, { status: 400 })
    }

    const item = await prisma.watchlist.upsert({
      where: { userId_tmdbId_mediaType: { userId, tmdbId: Number(tmdbId), mediaType } },
      update: {},
      create: { userId, tmdbId: Number(tmdbId), mediaType },
    })

    return NextResponse.json(item)
  } catch (err) {
    console.error("Watchlist add error:", err)
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  try {
    const tmdbId = request.nextUrl.searchParams.get("tmdbId")
    const mediaType = request.nextUrl.searchParams.get("mediaType")

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "Missing tmdbId or mediaType" }, { status: 400 })
    }

    await prisma.watchlist.delete({
      where: { userId_tmdbId_mediaType: { userId, tmdbId: Number(tmdbId), mediaType } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Watchlist delete error:", err)
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 })
  }
}
