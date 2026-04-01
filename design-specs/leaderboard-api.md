# Leaderboard — API Route Spec

**Page:** `src/app/leaderboard/page.tsx`
**API route to build:** `src/app/api/leaderboard/route.ts`

---

## Route: GET /api/leaderboard

### Auth
- Requires authentication. Return 401 if not signed in.
- Returns data scoped to the current user's **follows** (friends-only, not global).

---

## Response shape

```ts
interface LeaderboardData {
  mostCompared: LeaderboardEntry[]        // top 10, sorted desc by comparison count
  boldRanker: LeaderboardEntry[]          // top 10, sorted desc by bold score
  currentUserMostCompared: LeaderboardEntry | null   // current user's rank (null if no data)
  currentUserBoldRanker: LeaderboardEntry | null
}

interface LeaderboardEntry {
  rank: number           // 1-based position
  userId: string
  name: string | null
  image: string | null
  username: string | null
  value: number          // comparison count OR bold score
  isCurrentUser: boolean
}
```

---

## Most Compared — calculation

**What it measures:** Number of ELO comparisons (head-to-heads) done this month.

```ts
// Prisma: count Comparison rows per user within friends list, current calendar month
const since = new Date(new Date().getFullYear(), new Date().getMonth(), 1) // start of month

const rows = await prisma.comparison.groupBy({
  by: ['userId'],
  where: {
    userId: { in: [...followingIds, currentUserId] },
    createdAt: { gte: since },
  },
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } },
  take: 10,
})
```

> If `Comparison` model doesn't exist yet, use `Rating` table's `updatedAt` as proxy — count ratings updated this month.

---

## Bold Ranker — calculation

**What it measures:** How different a user's scores are from the friend group's consensus.

```ts
// For each title that multiple friends have rated:
// 1. Compute the group average normalized score
// 2. For each user, sum the absolute difference between their score and the group avg
// 3. Divide by number of shared titles → average divergence per title
// 4. This is the "bold score" — higher = more different from the group

// Algorithm:
// boldScore(user) = mean(|userScore(title) - groupAvg(title)|) for all titles user has rated

// Scope: only titles rated by at least 2 friends
// Use normalizeEloScores() per user before computing group avg
```

**Example:**
- Group avg for Succession: 8.2
- User A rates it: 5.1 → |5.1 - 8.2| = 3.1
- Group avg for The Bear: 7.8
- User A rates it: 9.5 → |9.5 - 7.8| = 1.7
- User A's bold score = (3.1 + 1.7) / 2 = 2.4

Bold scores typically range 0.5–3.5. Display as "+2.4".

---

## Caching

```ts
export const revalidate = 3600 // recompute hourly
```

Or use `unstable_cache` with a tag per user's follow graph.

---

## Edge vs Node runtime

This route does non-trivial DB aggregation — use **Node** runtime (default), not Edge.

```ts
// No runtime export needed — default is Node
```

---

## Notes for display

- The frontend already handles: empty state, loading skeleton, error retry
- The "You" badge on a row is driven by `isCurrentUser: true`
- The sticky "Your rank" banner at bottom only appears when `currentUserMostCompared`/`currentUserBoldRanker` is not null AND not in the top list
- Both lists are capped at 10 entries — the frontend renders all returned entries
