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

// Normalize all ELO scores in your list to a 0–10 display scale
// Your highest-rated movie approaches 10.0, lowest approaches 0.0
// Scores are relative to YOUR list, not a global standard
export function normalizeEloScores<T extends { tmdbId: number; eloScore: number }>(
  ratings: T[]
): (T & { displayScore: number })[] {
  if (ratings.length === 0) return []
  if (ratings.length === 1) return ratings.map((r) => ({ ...r, displayScore: 7.5 }))

  const scores = ratings.map((r) => r.eloScore)
  const min = Math.min(...scores)
  const max = Math.max(...scores)

  return ratings.map((r) => ({
    ...r,
    displayScore:
      max === min ? 7.5 : Math.round(((r.eloScore - min) / (max - min)) * 10 * 10) / 10,
  }))
}

// Pick the best candidates to compare against when you add a new movie
// Picks from across the ELO range (top, bottom, median, closest neighbors)
// so a few comparisons are enough to place the movie accurately
export function pickComparisonCandidates(
  newElo: number,
  existing: { tmdbId: number; eloScore: number }[],
  count = 4
): number[] {
  if (existing.length === 0) return []

  const sorted = [...existing].sort((a, b) => a.eloScore - b.eloScore)
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
