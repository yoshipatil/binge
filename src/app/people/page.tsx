import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getMovieDetails, getTVDetails, getPosterUrl } from "@/lib/tmdb"
import { getTitle } from "@/types"
import Image from "next/image"
import Link from "next/link"
import { UserPlus, Users, Clock, TrendingUp, Trophy, UserCheck } from "lucide-react"
import FollowButton from "@/components/FollowButton"
import { normalizeEloScores } from "@/lib/elo"
import { getTier } from "@/lib/tiers"

// Fetch title + poster for a tmdbId — fails gracefully
async function fetchTMDB(tmdbId: number, mediaType: string) {
  try {
    const details = mediaType === "tv" ? await getTVDetails(tmdbId) : await getMovieDetails(tmdbId)
    return { title: getTitle(details), poster: details.poster_path }
  } catch {
    return { title: String(tmdbId), poster: null }
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

// ── You May Know — friends-of-friends suggestions ─────────────────────────────
interface Suggestion {
  id: string
  name: string | null
  username: string | null
  image: string | null
  mutualCount: number
}

async function getSuggestions(userId: string, followingIds: string[]): Promise<Suggestion[]> {
  if (followingIds.length === 0) return []
  try {
    // Friends-of-friends: who do my friends follow that I don't?
    const friendsFollowing = await prisma.follow.findMany({
      where: { followerId: { in: followingIds }, followingId: { not: userId } },
      select: { followingId: true, followerId: true },
    })
    // Count mutual connections per candidate
    const mutualMap = new Map<string, Set<string>>()
    for (const row of friendsFollowing) {
      if (followingIds.includes(row.followingId)) continue // already following
      const set = mutualMap.get(row.followingId) ?? new Set()
      set.add(row.followerId)
      mutualMap.set(row.followingId, set)
    }
    if (mutualMap.size === 0) return []
    const candidateIds = [...mutualMap.keys()].slice(0, 10)
    const users = await prisma.user.findMany({
      where: { id: { in: candidateIds } },
      select: { id: true, name: true, username: true, image: true },
    })
    return users
      .map((u) => ({ ...u, mutualCount: mutualMap.get(u.id)?.size ?? 0 }))
      .sort((a, b) => b.mutualCount - a.mutualCount)
      .slice(0, 6)
  } catch {
    return []
  }
}

export default async function FriendsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  const userId = session.user.id

  const [followingRows, followerRows] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: userId }, select: { followingId: true } }),
    prisma.follow.findMany({ where: { followingId: userId }, select: { followerId: true } }),
  ])

  const followingIds = followingRows.map((f) => f.followingId)
  const followersCount = followerRows.length
  const followingCount = followingIds.length
  const hasFollows = followingIds.length > 0

  // Fetch suggestions in parallel with activity feed
  const suggestionsPromise = getSuggestions(userId, followingIds)

  // ── Activity feed ──────────────────────────────────────────────────
  let activity: {
    id: string; userId: string; userName: string | null; userImage: string | null
    tmdbId: number; mediaType: string; displayScore: number | null
    createdAt: Date; title: string; poster: string | null
  }[] = []

  // ── Trending this month ────────────────────────────────────────────
  let trending: { tmdbId: number; mediaType: string; avgScore: number; raterCount: number; title: string; poster: string | null }[] = []

  if (hasFollows) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [recentRatings, trendingRatings] = await Promise.all([
      prisma.rating.findMany({
        where: { userId: { in: followingIds } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, userId: true, tmdbId: true, mediaType: true, eloScore: true, createdAt: true },
      }),
      prisma.rating.findMany({
        where: { userId: { in: followingIds }, createdAt: { gte: since } },
        select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
      }),
    ])

    // Normalize ELO scores per user per mediaType
    const raterIds = [...new Set([...recentRatings, ...trendingRatings].map((r) => r.userId))]
    const allRaterRatings = raterIds.length > 0
      ? await prisma.rating.findMany({
          where: { userId: { in: raterIds } },
          select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
        })
      : []

    const displayScoreMap = new Map<string, number>()
    const grouped = new Map<string, typeof allRaterRatings>()
    for (const r of allRaterRatings) {
      const key = `${r.userId}:${r.mediaType}`
      const arr = grouped.get(key) ?? []
      arr.push(r)
      grouped.set(key, arr)
    }
    for (const [, ratings] of grouped) {
      for (const n of normalizeEloScores(ratings)) {
        displayScoreMap.set(`${n.userId}:${n.tmdbId}:${n.mediaType}`, n.displayScore)
      }
    }

    // User profiles
    const users = await prisma.user.findMany({
      where: { id: { in: raterIds } },
      select: { id: true, name: true, image: true },
    })
    const userMap = new Map(users.map((u) => [u.id, u]))

    // Fetch TMDB titles in parallel for activity items
    const activityWithScores = recentRatings.map((r) => ({
      ...r,
      userName: userMap.get(r.userId)?.name ?? null,
      userImage: userMap.get(r.userId)?.image ?? null,
      displayScore: displayScoreMap.get(`${r.userId}:${r.tmdbId}:${r.mediaType}`) ?? null,
    }))

    const activityTMDB = await Promise.all(
      activityWithScores.map((r) => fetchTMDB(r.tmdbId, r.mediaType))
    )
    activity = activityWithScores.map((r, i) => ({
      ...r,
      title: activityTMDB[i].title,
      poster: activityTMDB[i].poster,
    }))

    // Build trending
    const titleMap = new Map<string, { tmdbId: number; mediaType: string; scores: number[]; raterCount: number }>()
    for (const r of trendingRatings) {
      const score = displayScoreMap.get(`${r.userId}:${r.tmdbId}:${r.mediaType}`)
      if (score == null) continue
      const key = `${r.tmdbId}:${r.mediaType}`
      const entry = titleMap.get(key) ?? { tmdbId: r.tmdbId, mediaType: r.mediaType, scores: [], raterCount: 0 }
      entry.scores.push(score)
      entry.raterCount++
      titleMap.set(key, entry)
    }

    const trendingRaw = [...titleMap.values()]
      .map((e) => ({
        tmdbId: e.tmdbId,
        mediaType: e.mediaType,
        avgScore: Math.round((e.scores.reduce((a, b) => a + b, 0) / e.scores.length) * 10) / 10,
        raterCount: e.raterCount,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 8)

    const trendingTMDB = await Promise.all(trendingRaw.map((r) => fetchTMDB(r.tmdbId, r.mediaType)))
    trending = trendingRaw.map((r, i) => ({ ...r, title: trendingTMDB[i].title, poster: trendingTMDB[i].poster }))
  }

  const suggestions = await suggestionsPromise

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28 md:pb-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Your Circle</h1>
          {/* Following / Followers tappable stat links */}
          <div className="mt-1.5 flex items-center gap-3 text-sm text-white/40">
            <Link
              href={`/profile/${userId}/following`}
              className="hover:text-white/70 transition-colors"
            >
              <span className="font-bold text-white/70">{followingCount}</span> Following
            </Link>
            <span className="text-white/15">·</span>
            <Link
              href={`/profile/${userId}/followers`}
              className="hover:text-white/70 transition-colors"
            >
              <span className="font-bold text-white/70">{followersCount}</span> Followers
            </Link>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href="/leaderboard"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-amber-400 active:scale-95 transition-all duration-150"
            aria-label="Leaderboard"
          >
            <Trophy className="h-4 w-4" />
          </Link>
          <Link
            href="/people/search"
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 min-h-[44px] text-sm font-semibold text-white hover:bg-blue-500 active:scale-95 transition-all duration-150"
          >
            <UserPlus className="h-4 w-4" />
            <span>Find People</span>
          </Link>
        </div>
      </div>

      {/* ── No friends yet ── */}
      {!hasFollows && (
        <div className="flex flex-col items-center gap-5 py-24 text-center">
          <Users className="h-10 w-10 text-white/20" />
          <div>
            <p className="text-lg font-bold text-white">Your circle is quiet.</p>
            <p className="mt-1.5 max-w-xs text-sm text-white/35">
              Add people whose taste you trust.
            </p>
          </div>
          <Link
            href="/people/search"
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 active:scale-95 transition-all duration-150"
          >
            <UserPlus className="h-4 w-4" />
            Find people
          </Link>
        </div>
      )}

      {/* ── Has follows but no activity ── */}
      {hasFollows && activity.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Clock className="h-8 w-8 text-white/20" />
          <p className="text-sm text-white/35">Your circle hasn&apos;t ranked anything yet.</p>
        </div>
      )}

      {/* ── You May Know ── */}
      {suggestions.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <UserCheck className="h-3.5 w-3.5 text-white/50" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">People You May Know</h2>
          </div>
          <div className="flex flex-col gap-2">
            {suggestions.map((person) => (
              <div key={person.id} className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
                {/* Avatar */}
                <Link href={`/profile/${person.id}`} className="flex-shrink-0">
                  {person.image ? (
                    <Image
                      src={person.image}
                      alt={person.name ?? ""}
                      width={40}
                      height={40}
                      className="rounded-full ring-1 ring-white/10"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center ring-1 ring-white/10">
                      <span className="text-sm font-bold text-blue-400">
                        {(person.name ?? "?")[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${person.id}`}>
                    <p className="truncate text-sm font-semibold text-white/90 hover:text-white transition-colors">
                      {person.name ?? "Binge User"}
                    </p>
                  </Link>
                  <p className="text-xs text-white/30">
                    {person.username ? `@${person.username}` : ""}
                    {person.username && person.mutualCount > 0 ? " · " : ""}
                    {person.mutualCount > 0
                      ? `${person.mutualCount} mutual connection${person.mutualCount !== 1 ? "s" : ""}`
                      : ""}
                  </p>
                </div>

                {/* Follow CTA */}
                <div className="flex-shrink-0">
                  <FollowButton targetId={person.id} initialIsFollowing={false} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Activity feed ── */}
      {activity.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-white/50" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Recent Activity</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {activity.map((item) => {
              const tier = item.displayScore != null ? getTier(item.displayScore) : null
              return (
                <Link
                  key={item.id}
                  href={`/movie/${item.tmdbId}?type=${item.mediaType === "tv" ? "tv" : "movie"}`}
                  className="group flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3.5 hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors duration-150"
                >
                  {/* Poster */}
                  <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md bg-zinc-900">
                    {item.poster ? (
                      <Image
                        src={getPosterUrl(item.poster, "w154")}
                        alt={item.title}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/5" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                      {item.title}
                    </p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/35">
                      {item.userImage ? (
                        <Image
                          src={item.userImage}
                          alt={item.userName ?? ""}
                          width={14}
                          height={14}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="h-3.5 w-3.5 rounded-full bg-blue-500/30 flex-shrink-0" />
                      )}
                      <span className="truncate">{item.userName ?? "Someone"}</span>
                      <span className="text-white/20">·</span>
                      <span className="flex-shrink-0">{timeAgo(new Date(item.createdAt))}</span>
                    </div>
                  </div>

                  {/* Score badge */}
                  {item.displayScore != null && tier && (
                    <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${tier.dotColor}`}>
                      <span className="text-sm font-black">{item.displayScore.toFixed(1)}</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Trending Among Friends ── */}
      {trending.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-white/50" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Trending This Month</h2>
          </div>
          <div className="flex flex-col gap-2">
            {trending.map((item, i) => {
              const tier = getTier(item.avgScore)
              return (
                <Link
                  key={`${item.tmdbId}-${item.mediaType}`}
                  href={`/movie/${item.tmdbId}?type=${item.mediaType === "tv" ? "tv" : "movie"}`}
                  className="group flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3.5 hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors duration-150"
                >
                  <span className="w-5 text-center text-sm font-black text-white/20 tabular-nums">{i + 1}</span>

                  {/* Small poster */}
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

                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-white/85 group-hover:text-white transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {item.raterCount} friend{item.raterCount !== 1 ? "s" : ""} rated
                    </p>
                  </div>

                  {/* Aggregate score */}
                  <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${tier.dotColor}`}>
                    <span className="text-sm font-black">{item.avgScore.toFixed(1)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
