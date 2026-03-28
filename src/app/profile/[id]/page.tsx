import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getTier } from "@/lib/tiers"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"
import FollowButton from "@/components/FollowButton"
import { Star, Zap } from "lucide-react"

interface ProfilePageProps {
  params: Promise<{ id: string }>
}

// Fetch title for a single rated item — fails gracefully to the tmdbId
async function fetchTitle(tmdbId: number, mediaType: string): Promise<string> {
  try {
    const details = mediaType === "tv"
      ? await getTVDetails(tmdbId)
      : await getMovieDetails(tmdbId)
    return (details as { title?: string; name?: string }).title
      ?? (details as { name?: string }).name
      ?? String(tmdbId)
  } catch {
    return String(tmdbId)
  }
}

// Returns color class based on compatibility score
function getCompatibilityColor(score: number): string {
  if (score >= 80) return "text-blue-400"
  if (score >= 65) return "text-emerald-400"
  if (score >= 50) return "text-amber-400"
  return "text-white/55"
}

function getCompatibilityLabel(score: number): string {
  if (score >= 80) return "Great match"
  if (score >= 65) return "Strong overlap"
  if (score >= 50) return "Some common ground"
  return "Different tastes"
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params
  const session = await auth()
  const currentUserId = session?.user?.id ?? ""

  const [profileUser, followData, ratingCounts] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.follow.findMany({
      where: { OR: [{ followerId: id }, { followingId: id }] },
    }),
    prisma.rating.groupBy({
      by: ["mediaType"],
      where: { userId: id },
      _count: true,
    }),
  ])

  if (!profileUser) notFound()

  const followersCount = followData.filter((f) => f.followingId === id).length
  const followingCount = followData.filter((f) => f.followerId === id).length
  const isFollowing = followData.some(
    (f) => f.followerId === currentUserId && f.followingId === id
  )
  const isOwnProfile = currentUserId === id
  const totalRatings = ratingCounts.reduce((sum, r) => sum + (r._count as number), 0)

  // Fetch all ratings for the profile user, normalize per-type, extract top 5 movies and TV
  const allRatings = await prisma.rating.findMany({ where: { userId: id } })

  const movieRatings = allRatings.filter((r) => r.mediaType !== "tv")
  const tvRatings = allRatings.filter((r) => r.mediaType === "tv")

  const normalizedMovies = normalizeEloScores(movieRatings)
  const normalizedTV = normalizeEloScores(tvRatings)

  const top5Movies = [...normalizedMovies]
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, 5)

  const top5TV = [...normalizedTV]
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, 5)

  // Fetch real titles from TMDB for all top items in parallel
  const [movieTitles, tvTitles] = await Promise.all([
    Promise.all(top5Movies.map((r) => fetchTitle(r.tmdbId, r.mediaType))),
    Promise.all(top5TV.map((r) => fetchTitle(r.tmdbId, "tv"))),
  ])

  const hasAnyRankings = top5Movies.length > 0 || top5TV.length > 0

  // ── Taste Compatibility ──────────────────────────────────────────────
  // Only computed when viewing another user's profile while signed in
  let compatibility: number | null = null
  let compatibilityOverlapCount = 0

  if (!isOwnProfile && currentUserId) {
    const viewerRatings = await prisma.rating.findMany({ where: { userId: currentUserId } })

    // Normalize viewer's scores per media type (same split as profile user)
    const viewerMovieRatings = viewerRatings.filter((r) => r.mediaType !== "tv")
    const viewerTVRatings = viewerRatings.filter((r) => r.mediaType === "tv")

    const normalizedViewerMovies = normalizeEloScores(viewerMovieRatings)
    const normalizedViewerTV = normalizeEloScores(viewerTVRatings)

    // Build lookup: "tmdbId:mediaType" → displayScore
    const viewerScoreMap = new Map<string, number>()
    for (const r of [...normalizedViewerMovies, ...normalizedViewerTV]) {
      viewerScoreMap.set(`${r.tmdbId}:${r.mediaType}`, r.displayScore)
    }

    const profileScoreMap = new Map<string, number>()
    for (const r of [...normalizedMovies, ...normalizedTV]) {
      profileScoreMap.set(`${r.tmdbId}:${r.mediaType}`, r.displayScore)
    }

    // For each title rated by both users, compute per-title similarity (0–1)
    // similarity = 1 - abs(scoreA - scoreB) / 10
    const similarities: number[] = []
    for (const [key, viewerScore] of viewerScoreMap) {
      const profileScore = profileScoreMap.get(key)
      if (profileScore !== undefined) {
        similarities.push(1 - Math.abs(viewerScore - profileScore) / 10)
      }
    }

    // Require at least 3 overlapping titles for a meaningful score
    if (similarities.length >= 3) {
      const avg = similarities.reduce((sum, s) => sum + s, 0) / similarities.length
      compatibility = Math.round(avg * 100)
      compatibilityOverlapCount = similarities.length
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
      {/* Profile header */}
      <div className="flex items-start gap-5">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/10">
          {profileUser.image ? (
            <Image
              src={profileUser.image}
              alt={profileUser.name ?? "User"}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-2xl font-black text-blue-400">
                {profileUser.name?.[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black tracking-tight truncate">
            {profileUser.name ?? "Anonymous"}
          </h1>

          <div className="mt-2 flex gap-5 text-sm">
            <div className="text-center">
              <p className="font-bold text-white">{totalRatings}</p>
              <p className="text-[11px] text-white/40">Ranked</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-white">{followersCount}</p>
              <p className="text-[11px] text-white/40">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-white">{followingCount}</p>
              <p className="text-[11px] text-white/40">Following</p>
            </div>
          </div>
        </div>

        {!isOwnProfile && currentUserId && (
          <FollowButton targetId={id} initialIsFollowing={isFollowing} />
        )}
        {!isOwnProfile && !currentUserId && (
          <a
            href="/sign-in"
            className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            Sign in to follow
          </a>
        )}
      </div>

      {/* ── Taste Compatibility Card ──────────────────────────────────── */}
      {!isOwnProfile && currentUserId && (
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-5 py-4">
          {compatibility !== null ? (
            <div className="flex items-center justify-between gap-4">
              {/* Left: score callout */}
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Zap className="h-3 w-3 text-white/30" />
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    Taste Match
                  </p>
                </div>
                <p className={`text-5xl font-black tabular-nums leading-none ${getCompatibilityColor(compatibility)}`}>
                  {compatibility}%
                </p>
                <p className="mt-1.5 text-xs text-white/35">
                  Based on {compatibilityOverlapCount} titles you&apos;ve both seen
                </p>
              </div>

              {/* Right: label badge */}
              <div className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold ${
                compatibility >= 80
                  ? "bg-blue-500/15 text-blue-400"
                  : compatibility >= 65
                  ? "bg-emerald-500/15 text-emerald-400"
                  : compatibility >= 50
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-white/5 text-white/40"
              }`}>
                {getCompatibilityLabel(compatibility)}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 flex-shrink-0 text-white/20" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                  Taste Match
                </p>
                <p className="mt-0.5 text-sm text-white/50">Not enough overlap yet</p>
                <p className="mt-0.5 text-xs text-white/25">
                  Rate more of the same titles to compare tastes
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="my-6 h-px bg-white/5" />

      {!hasAnyRankings && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Star className="h-8 w-8 text-white/15" />
          <p className="text-sm text-white/40">No rankings yet</p>
        </div>
      )}

      <div className="flex flex-col gap-8">
        {/* Top Movies */}
        {top5Movies.length > 0 && (
          <RankingSection
            title="Top Movies"
            items={top5Movies.map((r, i) => ({
              rank: i + 1,
              tmdbId: r.tmdbId,
              mediaType: r.mediaType,
              displayScore: r.displayScore,
              title: movieTitles[i],
            }))}
          />
        )}

        {/* Top TV Shows */}
        {top5TV.length > 0 && (
          <RankingSection
            title="Top TV Shows"
            items={top5TV.map((r, i) => ({
              rank: i + 1,
              tmdbId: r.tmdbId,
              mediaType: "tv" as const,
              displayScore: r.displayScore,
              title: tvTitles[i],
            }))}
          />
        )}
      </div>
    </div>
  )
}

function RankingSection({
  title,
  items,
}: {
  title: string
  items: {
    rank: number
    tmdbId: number
    mediaType: string
    displayScore: number
    title: string
  }[]
}) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-white/40">
        {title}
      </h2>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const tier = getTier(item.displayScore)
          return (
            <Link
              key={item.tmdbId}
              href={`/movie/${item.tmdbId}?type=${item.mediaType === "tv" ? "tv" : "movie"}`}
              className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-4 py-3 hover:bg-white/[0.05] transition-colors"
            >
              <span className="w-5 text-center text-sm font-bold text-white/25">
                {item.rank}
              </span>
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${tier.dotColor}`} />
              <span className="flex-1 text-sm text-white/80 truncate">{item.title}</span>
              <span className="text-sm font-black text-white">
                {item.displayScore.toFixed(1)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
