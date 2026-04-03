import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getTier } from "@/lib/tiers"
import { getMovieDetails, getTVDetails, getPosterUrl, getMultipleMovies } from "@/lib/tmdb"
import FollowButton from "@/components/FollowButton"
import ProfileMenu from "@/components/ProfileMenu"
import ShareCardPreview from "@/components/ShareCardPreview"
import ProfileTabSwitcher from "@/components/ProfileTabSwitcher"
import TierList from "@/components/TierList"
import TasteTab from "@/components/TasteTab"
import AvatarUpload from "@/components/AvatarUpload"
import { Star, Zap, AtSign, Pencil, Popcorn } from "lucide-react"
import type { RatedItem, MediaType } from "@/types"

interface ProfilePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; type?: string }>
}

// Fetch title + poster for a single rated item — fails gracefully
async function fetchTMDB(tmdbId: number, mediaType: string): Promise<{ title: string; poster: string | null }> {
  try {
    const details = mediaType === "tv"
      ? await getTVDetails(tmdbId)
      : await getMovieDetails(tmdbId)
    const title = (details as { title?: string; name?: string }).title
      ?? (details as { name?: string }).name
      ?? String(tmdbId)
    return { title, poster: (details as { poster_path?: string | null }).poster_path ?? null }
  } catch {
    return { title: String(tmdbId), poster: null }
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

const RATING_THRESHOLD = 5

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { id } = await params
  const { tab: tabParam, type: typeParam } = await searchParams
  const activeTab = tabParam === "rankings" ? "rankings" : tabParam === "taste" ? "taste" : "overview"
  const activeType = typeParam === "movie" ? "movie" : typeParam === "tv" ? "tv" : "all"
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

  // Only show rankings if threshold met
  const showMovieRankings = movieRatings.length >= RATING_THRESHOLD
  const showTVRankings = tvRatings.length >= RATING_THRESHOLD

  const top5Movies = showMovieRankings
    ? [...normalizedMovies].sort((a, b) => b.displayScore - a.displayScore).slice(0, 5)
    : []

  const top5TV = showTVRankings
    ? [...normalizedTV].sort((a, b) => b.displayScore - a.displayScore).slice(0, 5)
    : []

  // Fetch real titles + posters from TMDB for all top items in parallel
  const [movieData, tvData] = await Promise.all([
    Promise.all(top5Movies.map((r) => fetchTMDB(r.tmdbId, r.mediaType))),
    Promise.all(top5TV.map((r) => fetchTMDB(r.tmdbId, "tv"))),
  ])

  const hasAnyRankings = top5Movies.length > 0 || top5TV.length > 0
  const hasNoRatings = totalRatings === 0

  // ── Rankings tab data ────────────────────────────────────────────────
  let rankingItems: RatedItem[] = []
  if (activeTab === "rankings") {
    const filteredRatings = activeType === "movie"
      ? allRatings.filter((r) => r.mediaType !== "tv")
      : activeType === "tv"
      ? allRatings.filter((r) => r.mediaType === "tv")
      : allRatings

    const grouped: Record<string, typeof filteredRatings> = {}
    for (const r of filteredRatings) {
      if (!grouped[r.mediaType]) grouped[r.mediaType] = []
      grouped[r.mediaType].push(r)
    }
    const withScores = Object.values(grouped)
      .flatMap((group) => normalizeEloScores(group))
      .sort((a, b) => b.displayScore - a.displayScore)

    const tmdbResults = await getMultipleMovies(
      withScores.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType }))
    )

    rankingItems = withScores
      .map((r, i) => ({
        rating: {
          id: r.id,
          tmdbId: r.tmdbId,
          mediaType: r.mediaType as MediaType,
          seedScore: r.seedScore,
          eloScore: r.eloScore,
          displayScore: isNaN(r.displayScore) ? 5 : (r.displayScore ?? 5),
          review: r.review ?? null,
          watchedAt: r.watchedAt instanceof Date ? r.watchedAt.toISOString() : String(r.watchedAt),
        },
        movie: tmdbResults[i],
      }))
      .filter((item): item is RatedItem => item.movie != null)
  }

  // ── Taste Compatibility ──────────────────────────────────────────────
  // Only computed when viewing another user's profile while signed in
  let compatibility: number | null = null
  let compatibilityOverlapCount = 0

  if (!isOwnProfile && currentUserId) {
    const viewerRatings = await prisma.rating.findMany({ where: { userId: currentUserId } })

    const viewerMovieRatings = viewerRatings.filter((r) => r.mediaType !== "tv")
    const viewerTVRatings = viewerRatings.filter((r) => r.mediaType === "tv")

    const normalizedViewerMovies = normalizeEloScores(viewerMovieRatings)
    const normalizedViewerTV = normalizeEloScores(viewerTVRatings)

    const viewerScoreMap = new Map<string, number>()
    for (const r of [...normalizedViewerMovies, ...normalizedViewerTV]) {
      viewerScoreMap.set(`${r.tmdbId}:${r.mediaType}`, r.displayScore)
    }

    const profileScoreMap = new Map<string, number>()
    for (const r of [...normalizedMovies, ...normalizedTV]) {
      profileScoreMap.set(`${r.tmdbId}:${r.mediaType}`, r.displayScore)
    }

    const similarities: number[] = []
    for (const [key, viewerScore] of viewerScoreMap) {
      const profileScore = profileScoreMap.get(key)
      if (profileScore !== undefined) {
        similarities.push(1 - Math.abs(viewerScore - profileScore) / 10)
      }
    }

    if (similarities.length >= 3) {
      const avg = similarities.reduce((sum, s) => sum + s, 0) / similarities.length
      compatibility = Math.round(avg * 100)
      compatibilityOverlapCount = similarities.length
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8">
      {/* ── Profile Header ── */}
      <div className="flex items-start gap-4">
        {/* Avatar — tappable on own profile */}
        {isOwnProfile ? (
          <AvatarUpload currentImage={profileUser.image} name={profileUser.name} />
        ) : (
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
        )}

        {/* Name + username + bio */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black tracking-tight truncate">
            {profileUser.name ?? "Anonymous"}
          </h1>
          {profileUser.username && (
            <p className="flex items-center gap-0.5 text-sm text-white/40 mt-0.5">
              <AtSign className="h-3.5 w-3.5" />
              {profileUser.username}
            </p>
          )}
          {profileUser.bio && (
            <p className="mt-2 text-sm text-white/55 leading-relaxed line-clamp-3">
              {profileUser.bio}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {isOwnProfile ? (
            <>
              <Link
                href="/profile/setup"
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Link>
              <ProfileMenu />
            </>
          ) : currentUserId ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/watch-together?friendIds=${id}`}
                className="flex h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/60 hover:bg-white/10 hover:text-white active:scale-95 transition-all duration-150"
                aria-label="Watch Together"
              >
                <Popcorn className="h-4 w-4" />
                <span className="hidden sm:inline">Watch Together</span>
              </Link>
              <FollowButton targetId={id} initialIsFollowing={isFollowing} />
            </div>
          ) : (
            <a
              href="/sign-in"
              className="flex-shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Follow
            </a>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="mt-5 flex gap-0 divide-x divide-white/8">
        <div className="pr-5 text-center">
          <p className="font-black text-white tabular-nums">{totalRatings}</p>
          <p className="text-[11px] text-white/50">Ranked</p>
        </div>
        <Link
          href={`/profile/${id}/followers`}
          className="px-5 text-center group"
        >
          <p className="font-black text-white tabular-nums group-hover:text-blue-400 transition-colors">
            {followersCount}
          </p>
          <p className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
            Followers
          </p>
        </Link>
        <Link
          href={`/profile/${id}/following`}
          className="pl-5 text-center group"
        >
          <p className="font-black text-white tabular-nums group-hover:text-blue-400 transition-colors">
            {followingCount}
          </p>
          <p className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
            Following
          </p>
        </Link>
      </div>

      {/* ── Taste Compatibility Card ── */}
      {!isOwnProfile && currentUserId && (
        <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-5 py-4">
          {compatibility !== null ? (
            <div className="flex items-center justify-between gap-4">
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

      {/* ── Tab Switcher ── */}
      <div className="my-6">
        <ProfileTabSwitcher profileId={id} totalRatings={totalRatings} />
      </div>

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <>
          {hasNoRatings && (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Star className="h-8 w-8 text-white/15" />
              <p className="text-sm text-white/40">No rankings yet</p>
            </div>
          )}

          {isOwnProfile && hasAnyRankings && (
            <ShareCardPreview userId={id} />
          )}

          <div className="flex flex-col gap-8">
            {showMovieRankings && top5Movies.length > 0 ? (
              <RankingSection
                title="Top Movies"
                items={top5Movies.map((r, i) => ({
                  rank: i + 1,
                  tmdbId: r.tmdbId,
                  mediaType: r.mediaType,
                  displayScore: r.displayScore,
                  title: movieData[i].title,
                  poster: movieData[i].poster,
                }))}
              />
            ) : movieRatings.length > 0 && movieRatings.length < RATING_THRESHOLD ? (
              <ThresholdNudge
                type="movies"
                ratedCount={movieRatings.length}
                needed={RATING_THRESHOLD}
                isOwnProfile={isOwnProfile}
              />
            ) : null}

            {showTVRankings && top5TV.length > 0 ? (
              <RankingSection
                title="Top TV Shows"
                items={top5TV.map((r, i) => ({
                  rank: i + 1,
                  tmdbId: r.tmdbId,
                  mediaType: "tv" as const,
                  displayScore: r.displayScore,
                  title: tvData[i].title,
                  poster: tvData[i].poster,
                }))}
              />
            ) : tvRatings.length > 0 && tvRatings.length < RATING_THRESHOLD ? (
              <ThresholdNudge
                type="TV shows"
                ratedCount={tvRatings.length}
                needed={RATING_THRESHOLD}
                isOwnProfile={isOwnProfile}
              />
            ) : null}
          </div>

        </>
      )}

      {/* ── Rankings tab ── */}
      {activeTab === "rankings" && (
        <TierList items={rankingItems} />
      )}

      {/* ── Taste DNA tab ── */}
      {activeTab === "taste" && (
        <TasteTab userId={id} />
      )}
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
    poster: string | null
  }[]
}) {
  return (
    <div>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/55">
        {title}
      </h2>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => {
          const tier = getTier(item.displayScore)
          return (
            <Link
              key={item.tmdbId}
              href={`/movie/${item.tmdbId}?type=${item.mediaType === "tv" ? "tv" : "movie"}`}
              className="group flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors duration-150"
            >
              <span className="w-5 text-center text-xs font-bold text-white/25 tabular-nums">
                {item.rank}
              </span>

              {/* Poster thumbnail */}
              <div className="relative h-12 w-8 flex-shrink-0 overflow-hidden rounded bg-zinc-900">
                {item.poster ? (
                  <Image
                    src={getPosterUrl(item.poster, "w154")}
                    alt={item.title}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-white/5" />
                )}
              </div>

              <span className="flex-1 text-sm text-white/80 truncate group-hover:text-white transition-colors">
                {item.title}
              </span>

              {/* Score badge */}
              <div className={`flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full ${tier.dotColor}`}>
                <span className="text-xs font-black">{item.displayScore.toFixed(1)}</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function ThresholdNudge({
  type,
  ratedCount,
  needed,
  isOwnProfile,
}: {
  type: string
  ratedCount: number
  needed: number
  isOwnProfile: boolean
}) {
  const remaining = needed - ratedCount
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-5 py-4">
      <p className="text-sm font-semibold text-white/50">
        {isOwnProfile
          ? `Rate ${remaining} more ${type} to unlock your rankings`
          : `Not enough ${type} ranked yet`}
      </p>
      <p className="mt-0.5 text-xs text-white/25">
        {ratedCount}/{needed} rated
      </p>
    </div>
  )
}
