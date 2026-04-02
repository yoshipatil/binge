import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import WatchTogetherPicker from "@/components/WatchTogetherPicker"
import WatchTogetherResults from "@/components/WatchTogetherResults"

interface WatchTogetherPageProps {
  searchParams: Promise<{ friendIds?: string }>
}

export default async function WatchTogetherPage({ searchParams }: WatchTogetherPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  const userId = session.user.id

  const { friendIds: friendIdsParam } = await searchParams
  const friendIds = friendIdsParam
    ? friendIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : []

  // ── Results mode: friendIds present ────────────────────────────────
  if (friendIds.length > 0) {
    // Fetch friend profiles so we can show their avatars in the header
    const friends = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: { id: true, name: true, image: true },
    })
    return (
      <WatchTogetherResults
        friendIds={friendIds}
        friends={friends}
      />
    )
  }

  // ── Picker mode: no friendIds ───────────────────────────────────────
  // Fetch all users this person follows, with compatibility scores
  const followingRows = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const followingIds = followingRows.map((r) => r.followingId)

  if (followingIds.length === 0) {
    redirect("/people")
  }

  const followingUsers = await prisma.user.findMany({
    where: { id: { in: followingIds } },
    select: { id: true, name: true, username: true, image: true },
  })

  // Compute taste compatibility % for each friend (reuse the same algorithm as profile page)
  const viewerRatings = await prisma.rating.findMany({ where: { userId } })
  const viewerMovieRatings = viewerRatings.filter((r) => r.mediaType !== "tv")
  const viewerTVRatings = viewerRatings.filter((r) => r.mediaType === "tv")
  const normalizedViewerMovies = normalizeEloScores(viewerMovieRatings)
  const normalizedViewerTV = normalizeEloScores(viewerTVRatings)

  const viewerScoreMap = new Map<string, number>()
  for (const r of [...normalizedViewerMovies, ...normalizedViewerTV]) {
    viewerScoreMap.set(`${r.tmdbId}:${r.mediaType}`, r.displayScore)
  }

  // For each friend, compute compatibility
  const allFriendRatings = await prisma.rating.findMany({
    where: { userId: { in: followingIds } },
    select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
  })

  // Group by userId and mediaType for normalization
  const groupedByUser = new Map<string, typeof allFriendRatings>()
  for (const r of allFriendRatings) {
    const key = r.userId
    const arr = groupedByUser.get(key) ?? []
    arr.push(r)
    groupedByUser.set(key, arr)
  }

  const friendCompatibility = new Map<string, number | null>()
  for (const [fUserId, ratings] of groupedByUser) {
    const movieR = ratings.filter((r) => r.mediaType !== "tv")
    const tvR = ratings.filter((r) => r.mediaType === "tv")
    const normMovies = normalizeEloScores(movieR)
    const normTV = normalizeEloScores(tvR)

    const similarities: number[] = []
    for (const r of [...normMovies, ...normTV]) {
      const viewerScore = viewerScoreMap.get(`${r.tmdbId}:${r.mediaType}`)
      if (viewerScore !== undefined) {
        similarities.push(1 - Math.abs(viewerScore - r.displayScore) / 10)
      }
    }
    if (similarities.length >= 3) {
      const avg = similarities.reduce((sum, s) => sum + s, 0) / similarities.length
      friendCompatibility.set(fUserId, Math.round(avg * 100))
    } else {
      friendCompatibility.set(fUserId, null)
    }
  }

  const friends = followingUsers
    .map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      image: u.image,
      compatibility: friendCompatibility.get(u.id) ?? null,
    }))
    .sort((a, b) => {
      // Sort: compatible first (desc), then null last
      if (a.compatibility === null && b.compatibility === null) return 0
      if (a.compatibility === null) return 1
      if (b.compatibility === null) return -1
      return b.compatibility - a.compatibility
    })

  return <WatchTogetherPicker friends={friends} />
}
