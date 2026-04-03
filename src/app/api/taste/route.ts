// GET /api/taste?userId=<id>
// Returns a computed taste profile for a user based on their ELO rankings.
//
// Data sources:
//   - Tier / media split: computed from DB ratings alone (no external calls)
//   - Genre affinity / era breakdown: resolved via TMDB detail calls (1-hr ISR cache)
//
// TMDB compliance:
//   - Attribution shown in app footer per TMDB ToS
//   - All calls use Next.js fetch ISR cache (revalidate: 3600) to minimise API usage
//
// Scalability path (when moving to commercial TMDB API tier or high traffic):
//   - Add a TMDBCache table (tmdbId, mediaType, genres JSON, releaseYear INT) populated
//     when users rate items. Switch the batch-fetch below to a prisma query instead.
//   - Zero changes to the response shape or consumer components needed.
//
// Rate limit: 30 req / min per IP (taste computation is CPU + I/O heavy)

import { type NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"
import { getTier, TIERS } from "@/lib/tiers"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit"

export const runtime = "nodejs"
export const maxDuration = 30

// ── Types ──────────────────────────────────────────────────────────────────────

export interface GenreAffinity {
  genre: string
  count: number
  avgScore: number
  tierText: string   // Tailwind text-color class from tier system (static — safe for JIT)
}

export interface EraBreakdown {
  decade: string     // "1980s" | "1990s" | "Pre-1970" etc.
  count: number
  avgScore: number
}

export interface MediaSplit {
  mediaType: string  // "movie" | "tv" | "documentary"
  count: number
  avgScore: number
  pct: number        // rounded percentage of total
}

export interface TierCount {
  label: string
  count: number
  tierText: string   // Tailwind text-color class
}

export interface TasteData {
  totalRated: number
  genres: GenreAffinity[]    // top 10 by avg score, min 2 titles
  eras: EraBreakdown[]       // all decades with at least 1 title, sorted by count desc
  mediaSplit: MediaSplit[]   // sorted by count desc
  tierDist: TierCount[]      // tier distribution across all rated items
  topGenre: string | null
  topEra: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function decadeLabel(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  const year = parseInt(dateStr.slice(0, 4), 10)
  if (isNaN(year) || year < 1900) return null
  if (year < 1970) return "Pre-1970"
  return `${Math.floor(year / 10) * 10}s`
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(
    `taste:${getClientIp(request.headers)}`,
    30,
    60_000
  )
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) return new Response("Missing userId", { status: 400 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) return new Response("Not found", { status: 404 })

  const allRatings = await prisma.rating.findMany({
    where: { userId },
    select: { tmdbId: true, mediaType: true, eloScore: true },
  })

  const empty: TasteData = {
    totalRated: 0,
    genres: [],
    eras: [],
    mediaSplit: [],
    tierDist: [],
    topGenre: null,
    topEra: null,
  }

  if (allRatings.length === 0) return Response.json(empty)

  // ── Normalize ELO scores per media type ──────────────────────────────────────
  // Movie and TV scores are normalized in separate pools (same as everywhere in app).
  const movieRatings = allRatings.filter((r) => r.mediaType !== "tv")
  const tvRatings    = allRatings.filter((r) => r.mediaType === "tv")
  const allNormalized = [
    ...normalizeEloScores(movieRatings),
    ...normalizeEloScores(tvRatings),
  ]

  // Build score map keyed by "tmdbId:mediaType"
  const scoreMap = new Map<string, number>()
  for (const r of allNormalized) {
    scoreMap.set(`${r.tmdbId}:${r.mediaType}`, r.displayScore)
  }

  // ── Media split (DB only — no TMDB needed) ───────────────────────────────────
  const byType = new Map<string, { count: number; total: number }>()
  for (const r of allRatings) {
    const score = scoreMap.get(`${r.tmdbId}:${r.mediaType}`) ?? 5
    const e = byType.get(r.mediaType) ?? { count: 0, total: 0 }
    e.count++
    e.total += score
    byType.set(r.mediaType, e)
  }
  const mediaSplit: MediaSplit[] = [...byType.entries()]
    .map(([mediaType, d]) => ({
      mediaType,
      count: d.count,
      avgScore: Math.round((d.total / d.count) * 10) / 10,
      pct: Math.round((d.count / allRatings.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // ── Tier distribution (DB only) ──────────────────────────────────────────────
  const tierCounts = new Map<string, number>(TIERS.map((t) => [t.label, 0]))
  for (const [, score] of scoreMap) {
    const tier = getTier(score)
    tierCounts.set(tier.label, (tierCounts.get(tier.label) ?? 0) + 1)
  }
  const tierDist: TierCount[] = TIERS
    .map((t) => ({ label: t.label, count: tierCounts.get(t.label) ?? 0, tierText: t.text }))
    .filter((t) => t.count > 0)

  // ── Batch TMDB fetch for genre + era (cached 1hr by Next.js ISR) ─────────────
  // Cap at top 100 by display score to keep latency predictable.
  // Future: swap this for a local TMDBCache table query (see file header).
  const topItems = [...allNormalized]
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, 100)

  const tmdbDetails = await Promise.all(
    topItems.map((r) =>
      (r.mediaType === "tv" ? getTVDetails(r.tmdbId) : getMovieDetails(r.tmdbId)).catch(
        () => null
      )
    )
  )

  // ── Genre affinity ────────────────────────────────────────────────────────────
  const genreMap = new Map<string, { total: number; count: number }>()
  for (let i = 0; i < topItems.length; i++) {
    const detail = tmdbDetails[i]
    if (!detail?.genres?.length) continue
    const score = topItems[i].displayScore
    for (const g of detail.genres) {
      const e = genreMap.get(g.name) ?? { total: 0, count: 0 }
      e.count++
      e.total += score
      genreMap.set(g.name, e)
    }
  }
  const genres: GenreAffinity[] = [...genreMap.entries()]
    .filter(([, d]) => d.count >= 2)
    .map(([genre, d]) => ({
      genre,
      count: d.count,
      avgScore: Math.round((d.total / d.count) * 10) / 10,
      tierText: getTier(d.total / d.count).text,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10)

  // ── Era breakdown ─────────────────────────────────────────────────────────────
  const eraMap = new Map<string, { total: number; count: number }>()
  for (let i = 0; i < topItems.length; i++) {
    const detail = tmdbDetails[i]
    if (!detail) continue
    const decade = decadeLabel(detail.release_date ?? detail.first_air_date)
    if (!decade) continue
    const score = topItems[i].displayScore
    const e = eraMap.get(decade) ?? { total: 0, count: 0 }
    e.count++
    e.total += score
    eraMap.set(decade, e)
  }
  const eras: EraBreakdown[] = [...eraMap.entries()]
    .map(([decade, d]) => ({
      decade,
      count: d.count,
      avgScore: Math.round((d.total / d.count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)

  const result: TasteData = {
    totalRated: allRatings.length,
    genres,
    eras,
    mediaSplit,
    tierDist,
    topGenre: genres[0]?.genre ?? null,
    topEra: eras[0]?.decade ?? null,
  }

  return Response.json(result, {
    headers: {
      // Cache at CDN edge for 5 min — taste profiles don't change on every request
      "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
    },
  })
}
