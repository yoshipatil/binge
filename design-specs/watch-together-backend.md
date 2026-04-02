---
written_by: frontend
date: 2026-04-02
status: READY_FOR_BACKEND
---

# Watch Together — Backend Spec

Frontend is built and waiting on this endpoint. This document has all confirmed contracts.

---

## Route

```
GET /api/watch-together?friendIds=id1,id2,id3
```

- Auth required (401 if not signed in)
- `friendIds` = comma-separated user IDs (the people the *current user* wants to watch with)
- The current user is identified from the session (JWT) — do NOT pass currentUserId in the query
- Max 5 friend IDs accepted; extras can be silently ignored

---

## Confirmed Response Shape

```ts
interface WatchTogetherResponse {
  results: WatchTogetherResult[]
  warnings: WatchTogetherWarning[]
}

interface WatchTogetherResult {
  tmdbId: number
  mediaType: "movie" | "tv"
  title: string           // from TMDB
  year: string            // "2019" (just the year string)
  posterPath: string | null  // e.g. "/abc123.jpg" — NOT the full URL (frontend prepends https://image.tmdb.org/t/p/w154)
  score: number           // 0.0–10.0, one decimal place
  reason: "overlap" | "fallback_popular"
  partiallyUnseen?: boolean  // true if ≥50% of group hasn't seen it (relaxed filter case)
}

interface WatchTogetherWarning {
  userId: string
  reason: "not_enough_ratings"  // extend with other reasons if needed
  name: string   // display name of the friend, for the warning banner
}
```

---

## Algorithm — what we need

1. **Collect the group**: current user + all provided friendIds
2. **Filter low-data users**: any user with fewer than **5 ratings** is excluded from the algorithm and added to `warnings[]` with `reason: "not_enough_ratings"`. Still compute results for the remaining group.
3. **Find overlap titles**: items rated by ≥2 group members. Score = weighted average of their ELO-normalized displayScores (use the same `normalizeEloScores()` from `src/lib/elo.ts`).
4. **Unseen filter (strict)**: only return titles that **none** of the group members have rated.
5. **If strict unseen pool runs dry**: relax to "unseen by ≥50% of group". Flag those with `partiallyUnseen: true`.
6. **Fallback (no overlap at all)**: fall back to "popular titles within the group's collective taste zones" — highest ELO items from all group members, merged and deduped. Flag these with `reason: "fallback_popular"`.
7. **Single valid user case**: if all friends are excluded (not enough ratings), still return results based on that one valid user's high-ELO unseen titles. Add a warning for each excluded friend.
8. **Order**: `results` sorted by `score` descending.
9. **Max results**: return up to **20** items.
10. **TMDB data**: fetch title + year + posterPath for each result item. Use existing `getMovieDetails` / `getTVDetails` helpers. Year = first 4 chars of release_date / first_air_date.

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Friend has <5 ratings | Exclude from algo, add to `warnings[]` |
| All friends have <5 ratings | Base results on current user only; warn for all friends |
| No overlap found | Fallback to popular within group's taste zones; `reason: "fallback_popular"` |
| Pool runs dry (all seen) | Relax to ≥50% unseen; `partiallyUnseen: true` on affected items |
| 0 valid users (even current user has <5) | Return `{ results: [], warnings: [] }` |
| Timeout / error | Standard 500 — frontend has retry UI |

---

## File location

```
src/app/api/watch-together/route.ts
```

---

## Rate limiting

Match existing API patterns (same rate limit as `/api/compare` or `/api/leaderboard` — suggest 30 req/min per user).

---

## Notes for backend

- Do NOT return items the **current user** has already rated (the "unseen" filter applies to everyone including the current user)
- `displayScore` for the result `score` field should be the **group average** of each member's display score for that title (only counting members who have rated it)
- Use `normalizeEloScores()` from `src/lib/elo.ts` per-user per-mediaType before computing averages — same as every other endpoint
- Neon HTTP adapter constraint: no `$transaction()` — use find+create manually
- TMDB calls can be parallelized with `Promise.all` for the final result set (same pattern as `/api/friends/trending`)
