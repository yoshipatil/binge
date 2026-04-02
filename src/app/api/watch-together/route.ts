// GET /api/watch-together?friendIds=id1,id2,id3
//
// Returns up to 20 title recommendations for a group to watch together.
//
// Algorithm (3 tiers):
// 1. Truly unseen (primary): titles in DB rated by non-group users that the group
//    hasn't seen. Scored by avg of external users' normalized ELO scores.
//    reason: "overlap"
//
// 2. Cross-recommendations (relaxed): titles seen by ≥1 valid group member
//    that ≥1 other hasn't seen. Scored by avg of raters' display scores.
//    reason: "overlap", partiallyUnseen: true (when ≥50% of group hasn't seen it)
//
// 3. Fallback: group's own top-rated titles (all seen, shown as "popular among us").
//    reason: "fallback_popular"
//
// Constraints:
//  - Users with <5 ratings are excluded from algo + added to warnings[]
//  - No $transaction(), no .upsert() (Neon HTTP adapter)
//  - normalizeEloScores() called per user per mediaType throughout

import { NextResponse, type NextRequest } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"

const MAX_RESULTS = 20
const MIN_RATINGS = 5

interface Candidate {
  tmdbId: number
  mediaType: string
  score: number
  reason: "overlap" | "fallback_popular"
  partiallyUnseen?: boolean
}

async function fetchTitle(tmdbId: number, mediaType: string) {
  try {
    const d = mediaType === "tv" ? await getTVDetails(tmdbId) : await getMovieDetails(tmdbId)
    const raw = d as unknown as Record<string, unknown>
    return {
      title: String(raw.title ?? raw.name ?? tmdbId),
      year: String(raw.release_date ?? raw.first_air_date ?? "").slice(0, 4),
      posterPath: (raw.poster_path as string | null) ?? null,
    }
  } catch {
    return { title: String(tmdbId), year: "", posterPath: null }
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  const { allowed, retryAfterMs } = checkRateLimit(`watch-together:${userId}`, 30, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const param = request.nextUrl.searchParams.get("friendIds") ?? ""
  const friendIds = [
    ...new Set(
      param
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s && s !== userId)
    ),
  ].slice(0, 5)

  if (friendIds.length === 0) {
    return NextResponse.json({ results: [], warnings: [] })
  }

  const allGroupIds = [userId, ...friendIds]

  // ── Friend profiles for warning display names ────────────────────────────
  const friendProfiles = await prisma.user.findMany({
    where: { id: { in: friendIds } },
    select: { id: true, name: true },
  })
  const nameOf = new Map(friendProfiles.map((p) => [p.id, p.name ?? "Friend"]))

  // ── All group ratings ────────────────────────────────────────────────────
  const groupRatings = await prisma.rating.findMany({
    where: { userId: { in: allGroupIds } },
    select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
  })

  const ratingsByUser = new Map<string, typeof groupRatings>()
  for (const r of groupRatings) {
    const arr = ratingsByUser.get(r.userId) ?? []
    arr.push(r)
    ratingsByUser.set(r.userId, arr)
  }

  // ── Validate: ≥5 ratings required per member ────────────────────────────
  const warnings: Array<{ userId: string; reason: string; name: string }> = []
  const validIds: string[] = []

  for (const gId of allGroupIds) {
    if ((ratingsByUser.get(gId)?.length ?? 0) >= MIN_RATINGS) {
      validIds.push(gId)
    } else if (gId !== userId) {
      // Don't warn about current user — just return empty if they don't qualify
      warnings.push({
        userId: gId,
        reason: "not_enough_ratings",
        name: nameOf.get(gId) ?? "Friend",
      })
    }
  }

  // Current user must qualify for any results to make sense
  if (!validIds.includes(userId)) {
    return NextResponse.json({ results: [], warnings })
  }

  // ── Normalize per valid member per mediaType ─────────────────────────────
  // scoreMap: "userId:tmdbId:mediaType" → displayScore (0–10)
  const scoreMap = new Map<string, number>()
  // seenByUser: userId → Set<"tmdbId:mediaType">
  const seenByUser = new Map<string, Set<string>>()

  for (const vid of validIds) {
    const ratings = ratingsByUser.get(vid) ?? []
    const movies = ratings.filter((r) => r.mediaType !== "tv")
    const tv = ratings.filter((r) => r.mediaType === "tv")
    const seenSet = new Set<string>()
    for (const r of [...normalizeEloScores(movies), ...normalizeEloScores(tv)]) {
      scoreMap.set(`${vid}:${r.tmdbId}:${r.mediaType}`, r.displayScore)
      seenSet.add(`${r.tmdbId}:${r.mediaType}`)
    }
    seenByUser.set(vid, seenSet)
  }

  // Group-wide seen set (union of all valid members' ratings)
  const groupSeen = new Set<string>()
  for (const s of seenByUser.values()) for (const k of s) groupSeen.add(k)

  const candidates: Candidate[] = []
  const addedKeys = new Set<string>()

  // ── Tier 1: Truly unseen titles from external users ──────────────────────
  // Fetch ALL ratings from non-group users (used both for finding unseen titles
  // and for normalizing their scores — one query for both purposes).
  const externalRatings = await prisma.rating.findMany({
    where: { userId: { notIn: allGroupIds } },
    select: { userId: true, tmdbId: true, mediaType: true, eloScore: true },
  })

  const unseenExternal = externalRatings.filter(
    (r) => !groupSeen.has(`${r.tmdbId}:${r.mediaType}`)
  )

  if (unseenExternal.length > 0) {
    // Normalize per external user using their full rating set
    const extScoreMap = new Map<string, number>()
    const extByUser = new Map<string, typeof externalRatings>()
    for (const r of externalRatings) {
      const arr = extByUser.get(r.userId) ?? []
      arr.push(r)
      extByUser.set(r.userId, arr)
    }
    for (const [extId, ratings] of extByUser) {
      const movies = ratings.filter((r) => r.mediaType !== "tv")
      const tv = ratings.filter((r) => r.mediaType === "tv")
      for (const r of [...normalizeEloScores(movies), ...normalizeEloScores(tv)]) {
        extScoreMap.set(`${extId}:${r.tmdbId}:${r.mediaType}`, r.displayScore)
      }
    }

    // Aggregate scores per unseen title
    const titleAgg = new Map<
      string,
      { tmdbId: number; mediaType: string; scores: number[] }
    >()
    for (const r of unseenExternal) {
      const score = extScoreMap.get(`${r.userId}:${r.tmdbId}:${r.mediaType}`)
      if (score === undefined) continue
      const key = `${r.tmdbId}:${r.mediaType}`
      const entry = titleAgg.get(key) ?? {
        tmdbId: r.tmdbId,
        mediaType: r.mediaType,
        scores: [],
      }
      entry.scores.push(score)
      titleAgg.set(key, entry)
    }

    for (const [key, entry] of titleAgg) {
      const avg = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
      candidates.push({
        tmdbId: entry.tmdbId,
        mediaType: entry.mediaType,
        score: Math.round(avg * 10) / 10,
        reason: "overlap",
      })
      addedKeys.add(key)
    }
  }

  // ── Tier 2: Cross-recommendations (seen by some in group, not all) ───────
  if (candidates.length < MAX_RESULTS) {
    // For each title any valid member has rated, compute group-wide seen/unseen counts
    const crossAgg = new Map<
      string,
      { tmdbId: number; mediaType: string; seenCount: number; totalScore: number }
    >()

    for (const vid of validIds) {
      for (const key of seenByUser.get(vid)!) {
        if (addedKeys.has(key)) continue
        const colonIdx = key.indexOf(":")
        const tmdbId = parseInt(key.slice(0, colonIdx))
        const mediaType = key.slice(colonIdx + 1)
        const score = scoreMap.get(`${vid}:${tmdbId}:${mediaType}`) ?? 5

        const entry = crossAgg.get(key) ?? {
          tmdbId,
          mediaType,
          seenCount: 0,
          totalScore: 0,
        }
        entry.seenCount++
        entry.totalScore += score
        crossAgg.set(key, entry)
      }
    }

    for (const [key, entry] of crossAgg) {
      // Skip titles everyone in the valid group has already seen
      if (entry.seenCount === validIds.length) continue

      const avg = entry.totalScore / entry.seenCount
      // partiallyUnseen: ≥50% of valid group members haven't seen this
      const unseenFraction = (validIds.length - entry.seenCount) / validIds.length

      candidates.push({
        tmdbId: entry.tmdbId,
        mediaType: entry.mediaType,
        score: Math.round(avg * 10) / 10,
        reason: "overlap",
        ...(unseenFraction >= 0.5 ? { partiallyUnseen: true as const } : {}),
      })
      addedKeys.add(key)
    }
  }

  // ── Tier 3: Fallback — group's collective top-rated (all seen) ───────────
  if (candidates.length === 0) {
    const fbSeen = new Set<string>()
    for (const vid of validIds) {
      const ratings = ratingsByUser.get(vid) ?? []
      const movies = ratings.filter((r) => r.mediaType !== "tv")
      const tv = ratings.filter((r) => r.mediaType === "tv")
      for (const r of [...normalizeEloScores(movies), ...normalizeEloScores(tv)]) {
        const key = `${r.tmdbId}:${r.mediaType}`
        if (fbSeen.has(key)) continue
        fbSeen.add(key)
        candidates.push({
          tmdbId: r.tmdbId,
          mediaType: r.mediaType,
          score: Math.round(r.displayScore * 10) / 10,
          reason: "fallback_popular",
        })
      }
    }
  }

  // ── Sort by score desc, cap at 20 ────────────────────────────────────────
  candidates.sort((a, b) => b.score - a.score)
  const top = candidates.slice(0, MAX_RESULTS)

  if (top.length === 0) return NextResponse.json({ results: [], warnings })

  // ── Fetch TMDB metadata in parallel ──────────────────────────────────────
  const tmdbData = await Promise.all(top.map((c) => fetchTitle(c.tmdbId, c.mediaType)))

  return NextResponse.json({
    results: top.map((c, i) => ({
      tmdbId: c.tmdbId,
      mediaType: c.mediaType as "movie" | "tv",
      title: tmdbData[i].title,
      year: tmdbData[i].year,
      posterPath: tmdbData[i].posterPath,
      score: c.score,
      reason: c.reason,
      ...(c.partiallyUnseen ? { partiallyUnseen: true } : {}),
    })),
    warnings,
  })
}
