// GET    /api/watchlist              — all watchlist items
// POST   /api/watchlist              — add to watchlist { tmdbId, mediaType }
// DELETE /api/watchlist?tmdbId=&mediaType= — remove from watchlist
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const items = await prisma.watchlist.findMany({
      orderBy: { addedAt: "desc" },
    })
    return NextResponse.json(items)
  } catch (err) {
    console.error("Watchlist fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tmdbId, mediaType } = await request.json()

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "Missing tmdbId or mediaType" }, { status: 400 })
    }

    const item = await prisma.watchlist.upsert({
      where: { tmdbId_mediaType: { tmdbId: Number(tmdbId), mediaType } },
      update: {},
      create: { tmdbId: Number(tmdbId), mediaType },
    })

    return NextResponse.json(item)
  } catch (err) {
    console.error("Watchlist add error:", err)
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tmdbId = request.nextUrl.searchParams.get("tmdbId")
    const mediaType = request.nextUrl.searchParams.get("mediaType")

    if (!tmdbId || !mediaType) {
      return NextResponse.json({ error: "Missing tmdbId or mediaType" }, { status: 400 })
    }

    await prisma.watchlist.delete({
      where: { tmdbId_mediaType: { tmdbId: Number(tmdbId), mediaType } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Watchlist delete error:", err)
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 })
  }
}
