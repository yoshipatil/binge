import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// POST /api/admin/merge-users
// One-time endpoint: finds all duplicate User records (same email, different IDs),
// reassigns their ratings/watchlist/follows to the oldest record, then deletes duplicates.
// Only callable by a signed-in user (merges YOUR duplicates only).
export async function POST() {
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = session.user.email

  // Find all user records sharing this email
  const duplicates = await prisma.user.findMany({ where: { email } })

  if (duplicates.length <= 1) {
    return NextResponse.json({ message: "No duplicates found", count: duplicates.length })
  }

  // Pick the user with the most ratings as canonical (the "real" account)
  const ratingCounts = await Promise.all(
    duplicates.map(async (u) => ({
      user: u,
      count: await prisma.rating.count({ where: { userId: u.id } }),
    }))
  )
  ratingCounts.sort((a, b) => b.count - a.count)

  const canonical = ratingCounts[0].user
  const dupeIds = ratingCounts.slice(1).map((r) => r.user.id)

  let ratingsMoved = 0
  let watchlistMoved = 0
  let followsMoved = 0

  for (const dupeId of dupeIds) {
    // Reassign ratings — skip any that would violate the unique(userId,tmdbId,mediaType) constraint
    const ratings = await prisma.rating.findMany({ where: { userId: dupeId } })
    for (const r of ratings) {
      const conflict = await prisma.rating.findUnique({
        where: { userId_tmdbId_mediaType: { userId: canonical.id, tmdbId: r.tmdbId, mediaType: r.mediaType } },
      })
      if (!conflict) {
        await prisma.rating.update({ where: { id: r.id }, data: { userId: canonical.id } }).catch(() => {})
        ratingsMoved++
      }
      // If conflict, the canonical user already has a rating for this title — discard the dupe
    }

    // Reassign watchlist items
    const watchlist = await prisma.watchlist.findMany({ where: { userId: dupeId } })
    for (const w of watchlist) {
      const conflict = await prisma.watchlist.findUnique({
        where: { userId_tmdbId_mediaType: { userId: canonical.id, tmdbId: w.tmdbId, mediaType: w.mediaType } },
      })
      if (!conflict) {
        await prisma.watchlist.update({ where: { id: w.id }, data: { userId: canonical.id } }).catch(() => {})
        watchlistMoved++
      }
    }

    // Reassign follows (both directions)
    const asFollower = await prisma.follow.findMany({ where: { followerId: dupeId } })
    for (const f of asFollower) {
      const conflict = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: canonical.id, followingId: f.followingId } },
      })
      if (!conflict) {
        await prisma.follow.update({ where: { id: f.id }, data: { followerId: canonical.id } }).catch(() => {})
        followsMoved++
      }
    }

    const asFollowing = await prisma.follow.findMany({ where: { followingId: dupeId } })
    for (const f of asFollowing) {
      const conflict = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: f.followerId, followingId: canonical.id } },
      })
      if (!conflict) {
        await prisma.follow.update({ where: { id: f.id }, data: { followingId: canonical.id } }).catch(() => {})
        followsMoved++
      }
    }

    // Delete comparisons (not worth merging — ELO will re-establish naturally)
    await prisma.comparison.deleteMany({ where: { userId: dupeId } }).catch(() => {})

    // Delete the duplicate user record
    await prisma.user.delete({ where: { id: dupeId } }).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    canonical: canonical.id,
    merged: dupeIds.length,
    ratingsMoved,
    watchlistMoved,
    followsMoved,
  })
}
