// GET    /api/watchlist              — your watchlist items
// POST   /api/watchlist              — add to watchlist { tmdbId, mediaType }
// DELETE /api/watchlist?tmdbId=&mediaType= — remove from watchlist
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

const VALID_MEDIA_TYPES = ["movie", "tv", "documentary"] as const
type ValidMediaType = (typeof VALID_MEDIA_TYPES)[number]

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
    const body = await request.json()

    // --- Input validation ---
    const tmdbId = Number(body.tmdbId)
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 })
    }
    if (!VALID_MEDIA_TYPES.includes(body.mediaType)) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 })
    }
    const mediaType = body.mediaType as ValidMediaType
    // --- End validation ---

    // Neon HTTP adapter doesn't support transactions, so avoid upsert (which uses one internally)
    const existing = await prisma.watchlist.findUnique({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    })
    const item = existing ?? await prisma.watchlist.create({
      data: { userId, tmdbId, mediaType },
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
    const tmdbId = Number(request.nextUrl.searchParams.get("tmdbId"))
    const mediaType = request.nextUrl.searchParams.get("mediaType")

    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 })
    }
    if (!mediaType || !VALID_MEDIA_TYPES.includes(mediaType as ValidMediaType)) {
      return NextResponse.json({ error: "Invalid mediaType" }, { status: 400 })
    }

    await prisma.watchlist.delete({
      where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Watchlist delete error:", err)
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 })
  }
}
