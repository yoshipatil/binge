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

// Convert a 1–10 seed score into a starting ELO (800–1200 range) with ±25pt jitter.
// Jitter prevents movies in the same tier from all clustering at identical ELO values,
// which causes the first few comparisons to feel arbitrary. Small spread → faster convergence.
export function seedEloFromScore(score: number): number {
  const base = 800 + (score / 10) * 400
  const jitter = (Math.random() - 0.5) * 50 // ±25 points
  return Math.round(base + jitter)
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
// Strategy: always include the closest above/below neighbor (accurate placement),
// plus weighted random samples from the rest of the pool (diversity).
// This is better than always picking median/top/bottom because:
//   - Deterministic picks create "hot paths" where the same pairs are always compared
//   - Weighted randomness gives the new movie exposure to a wider range over time
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
  const candidates = new Set<number>()

  // Always include the closest neighbor above and below — these are the most informative
  // comparisons for accurate placement (binary search property)
  const above = sorted.filter((r) => r.eloScore >= newElo)
  if (above.length > 0) candidates.add(above[0].tmdbId)

  const below = sorted.filter((r) => r.eloScore < newElo)
  if (below.length > 0) candidates.add(below[below.length - 1].tmdbId)

  // Fill remaining slots with weighted random samples from the rest of the pool.
  // Weight = 1 / (1 + distance) so closer movies are more likely but not certain.
  // This adds diversity vs. always picking the same top/median/bottom.
  const remaining = sorted.filter((r) => !candidates.has(r.tmdbId))
  if (remaining.length > 0 && candidates.size < count) {
    const weights = remaining.map((r) => 1 / (1 + Math.abs(r.eloScore - newElo)))
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    while (candidates.size < count && remaining.length > candidates.size) {
      let rand = Math.random() * totalWeight
      for (let i = 0; i < remaining.length; i++) {
        rand -= weights[i]
        if (rand <= 0 && !candidates.has(remaining[i].tmdbId)) {
          candidates.add(remaining[i].tmdbId)
          break
        }
      }
      // Safety: if weighted sampling stalls, just add the first unselected item
      const unselected = remaining.find((r) => !candidates.has(r.tmdbId))
      if (unselected) candidates.add(unselected.tmdbId)
    }
  }

  return [...candidates].slice(0, count)
}
