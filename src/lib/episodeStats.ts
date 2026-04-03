// Direct Prisma helper for episode watch progress.
// Use this in server components (TierSection, watchlist page) instead of
// calling /api/episodes/watched over HTTP — avoids cookie-forwarding issues
// and removes an unnecessary network round-trip.

import { prisma } from "@/lib/prisma"

export interface EpisodeStats {
  totalWatched: number
  perSeason: Record<number, number>
}

/**
 * Get episode watch progress for a single show.
 * Returns totalWatched count and per-season watched counts.
 * Note: totalEpisodes is NOT returned here — derive it from movie.seasons on the caller
 * side (it comes from TMDB data, not the DB).
 */
export async function getEpisodeStats(
  userId: string,
  showTmdbId: number
): Promise<EpisodeStats> {
  const watched = await prisma.watchedEpisode.findMany({
    where: { userId, showTmdbId },
    select: { seasonNum: true },
  })

  const perSeason: Record<number, number> = {}
  for (const ep of watched) {
    perSeason[ep.seasonNum] = (perSeason[ep.seasonNum] ?? 0) + 1
  }

  return {
    totalWatched: watched.length,
    perSeason,
  }
}

/**
 * Get episode stats for multiple shows in a single parallel batch.
 * Returns a map keyed by showTmdbId.
 */
export async function getEpisodeStatsBatch(
  userId: string,
  showTmdbIds: number[]
): Promise<Map<number, EpisodeStats>> {
  if (showTmdbIds.length === 0) return new Map()

  const watched = await prisma.watchedEpisode.findMany({
    where: { userId, showTmdbId: { in: showTmdbIds } },
    select: { showTmdbId: true, seasonNum: true },
  })

  // Group by showTmdbId
  const map = new Map<number, EpisodeStats>()

  // Initialize all requested shows with empty stats
  for (const id of showTmdbIds) {
    map.set(id, { totalWatched: 0, perSeason: {} })
  }

  for (const ep of watched) {
    const stats = map.get(ep.showTmdbId)!
    stats.totalWatched += 1
    stats.perSeason[ep.seasonNum] = (stats.perSeason[ep.seasonNum] ?? 0) + 1
  }

  return map
}
