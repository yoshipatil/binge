// ELO ranking algorithm — the engine behind Binge's dynamic rankings
// When you compare two movies, the "winner" gains ELO and the "loser" loses ELO
// Over time, your true preferences emerge from these comparisons

const K = 32 // how much each comparison shifts scores (standard chess ELO value)

export function calculateElo(winnerElo: number, loserElo: number) {
  const expected = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400))
  return {
    newWinner: Math.round((winnerElo + K * (1 - expected)) * 10) / 10,
    newLoser: Math.round((loserElo + K * (0 - (1 - expected))) * 10) / 10,
  }
}

// Convert a 1–10 seed score into a starting ELO (800–1200 range)
// So a movie you rate 9/10 starts with higher ELO than one you rate 5/10
export function seedEloFromScore(score: number): number {
  return 800 + (score / 10) * 400
}

// Normalize ELO scores to a 0–10 display scale.
// Uses a dynamic floor/ceiling that expands to fit the actual distribution,
// with a minimum spread of 600 pts to keep the scale stable for small lists.
// This prevents scores from ever going below 0 or above 10 as ratings accumulate.
export function normalizeEloScores<T extends { tmdbId: number; eloScore: number }>(
  ratings: T[]
): (T & { displayScore: number })[] {
  if (ratings.length === 0) return []

  const elos = ratings.map((r) => r.eloScore)
  const minElo = Math.min(...elos)
  const maxElo = Math.max(...elos)

  // Anchor floor/ceiling to at least 700–1300 (300pt padding on each side of seed range 800–1200).
  // If real data goes outside that window, expand to fit with 50pt padding.
  const floor = Math.min(minElo - 50, 700)
  const ceiling = Math.max(maxElo + 50, 1300)
  const range = ceiling - floor

  return ratings.map((r) => ({
    ...r,
    displayScore: Math.round(((r.eloScore - floor) / range) * 10 * 10) / 10,
  }))
}

// Pick the best candidates to compare against when you add a new movie.
// Picks from across the ELO range (top, bottom, median, closest neighbors)
// so a few comparisons are enough to place the movie accurately.
// excludedIds: movies already compared against this one — never show the same matchup twice.
export function pickComparisonCandidates(
  newElo: number,
  existing: { tmdbId: number; eloScore: number }[],
  count = 4,
  excludedIds: number[] = []
): number[] {
  if (existing.length === 0) return []

  const excludeSet = new Set(excludedIds)
  // Filter out already-compared opponents. If we've compared against everything,
  // fall back to the full list so we never return 0 candidates.
  const pool = existing.filter((r) => !excludeSet.has(r.tmdbId))
  const source = pool.length > 0 ? pool : existing

  const sorted = [...source].sort((a, b) => a.eloScore - b.eloScore)
  const n = sorted.length
  const candidates = new Set<number>()

  // Closest above the new movie
  const above = sorted.filter((r) => r.eloScore >= newElo)
  if (above.length > 0) candidates.add(above[0].tmdbId)

  // Closest below the new movie
  const below = sorted.filter((r) => r.eloScore < newElo)
  if (below.length > 0) candidates.add(below[below.length - 1].tmdbId)

  candidates.add(sorted[n - 1].tmdbId) // top of list
  candidates.add(sorted[0].tmdbId) // bottom of list
  if (n > 2) candidates.add(sorted[Math.floor(n / 2)].tmdbId) // median

  return [...candidates].slice(0, count)
}
