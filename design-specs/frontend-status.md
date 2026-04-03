# Frontend Status — Session 3

This file is the frontend→backend communication update. Read this to stay in sync.

---

## What Frontend Built This Session

### UI Fixes (no API impact)
- NavBar + BottomNav polish (icon sizes, contrast, For You tab restored)
- Circle page empty state contrast
- People Search no-results empty state icon
- Sign-in tagline contrast

### Leaderboard page — KEY FIX
- Renamed `boldRanker` → `boldRankers` in the frontend type + all references to match your API contract
- Also renamed `currentUserBoldRanker` → `currentUserBoldRankers`
- **Backend: please confirm your response shape uses `boldRankers` (plural)**

### ShareCard component
- Built `src/components/ShareCard.tsx` — satori-compatible JSX for PNG rendering
- The API route (`/api/share/card`) is on your side — see design-specs/share-card-api.md
- Frontend hits it at: `GET /api/share/card?userId=<id>&type=preview|stories`
- Wired into profile page at `src/components/ShareCardButton.tsx`

---

## What Frontend Is Building Next

### 1. Profile Tabs (Rankings integrated into Profile)
- Profile page gets an **Overview** tab + **Rankings** tab
- Rankings tab shows the full TierList for this user (own OR others)
- **No new API needed** — data is fetched server-side via Prisma on the profile page
- `/rankings` route will still exist but Rankings removed from BottomNav
- BottomNav becomes: Home · Search · For You · Circle · Me

### 2. Avatar Upload UI (uses your POST /api/users/avatar)
- Tapping own avatar on profile opens file picker
- Uploads to POST /api/users/avatar (multipart/form-data, field: `file`)
- Shows spinner during upload, updates avatar immediately on success
- **Backend: confirm POST /api/users/avatar is live and matches spec in design-specs/avatar-upload-api.md**

### 3. Ranking Reveal Animation (uses your GET /api/compare/count)
- After 25 comparisons, trigger animated Framer Motion reveal of updated ranking
- **Backend: confirm GET /api/compare/count → { total: number } is live**

---

## APIs I Need Confirmed Live

| Endpoint | Shape | Status (please update) |
|----------|-------|------------------------|
| GET /api/leaderboard | `{ mostCompared: Entry[], boldRankers: Entry[], currentUserMostCompared: Entry\|null, currentUserBoldRankers: Entry\|null }` | Backend says building |
| GET /api/compare/count | `{ total: number }` | Backend says building |
| POST /api/users/avatar | multipart/form-data → `{ url: string }` | Built per git log — confirm shape |
| PATCH /api/users/profile | `{ username?, bio? }` → updated user | Backend says live |

---

## New Specs I Need From Backend

None right now — existing specs + contracts cover everything I'm building this session.
If you add new endpoints, drop the shape here or in a new design-specs/ file.

---

---

# Episode Tracking UI — Frontend Build Status (Current Session)

_Built by frontend implementation sub-agent. Backend integration pending Prisma migration._

---

## What Was Built

### New Episode Components (`src/components/episodes/`)

| File | Notes |
|------|-------|
| `EpisodeProgressPill.tsx` | Exact spec classes, null guard when totalEpisodes === 0 |
| `EpisodePanel.tsx` | Full orchestrator: open/close, watched fetch, lazy season fetch, optimistic toggle, mark-all, error/loading states, reduced-motion, a11y |
| `SeasonTabBar.tsx` | Roving tabindex, ArrowLeft/Right/Home/End keyboard nav, specials sorted last |
| `SeasonTab.tsx` | Active/inactive states, completion indicator, specials label |
| `EpisodeList.tsx` | AnimatePresence season crossfade, loading skeletons, empty state |
| `EpisodeRow.tsx` | Optimistic toggle, watched left-border accent, full aria-label, keyboard |
| `EpisodeRowSkeleton.tsx` | Shimmer skeleton per spec |
| `EpisodeListEmpty.tsx` | Tv icon + empty copy |
| `TVCardEpisodeWrapper.tsx` | Client-side bridge for server-fetched initialEpisodeStats + optimistic updates |

### Modified Files

| File | Change |
|------|--------|
| `src/components/MovieCard.tsx` | Added `"use client"`, `episodeStats` + `onWatchedChange` props, `EpisodeProgressPill` and `EpisodePanel` for `mediaType === "tv"` |
| `src/components/TierSection.tsx` | Made `async`, fetches episode stats for TV items, renders `TVCardEpisodeWrapper` |
| `src/app/watchlist/page.tsx` | Fetches episode stats for TV watchlist items, renders `TVCardEpisodeWrapper` |

### Tests

| File | Result |
|------|--------|
| `tests/episode-tracking.spec.ts` | 9 passing, 6 skipped (need `/test-fixture/tv-card` fixture page to activate) |

---

## Deviations from Spec

1. **`MovieCard.tsx` is now `"use client"`** — required because it imports `EpisodePanel` (hooks). Correct RSC pattern.

2. **`TVCardEpisodeWrapper.tsx` is a new file not in spec** — needed to bridge server-fetched initial stats with client-side optimistic state. Standard RSC pattern.

3. **`TierSection.tsx` fetches via internal HTTP** — calls `/api/episodes/watched` server-side without session cookie forwarding. This means the progress pill will show 0/N until the user opens the panel (which fetches client-side with cookie). Pill updates instantly after first panel open.

4. **Toast uses `react-hot-toast`** — that's what's installed. Not shadcn useToast.

---

## Critical Blockers for Backend Agent

1. **Prisma migration:** `watchedEpisode` model doesn't exist yet — 4 TS errors in `src/app/api/episodes/watched/route.ts`. Run migration before testing.

2. **`movie.seasons` must be present on TV items from `getMultipleMovies()`** — the episode tracking guard `movie.seasons?.filter(s => s.season_number > 0).length > 0` will return false (no episode UI) if `seasons` is not in the TMDB response. If `getMultipleMovies()` uses a search/discover endpoint that omits `seasons[]`, the backend agent needs to enrich TV items with a `/tv/{id}` detail call.

3. **Server-side episode stats fetch** — provide a direct Prisma helper `getEpisodeStats(userId, tmdbId)` so `TierSection` can call it without HTTP (avoids the cookie forwarding problem entirely).

4. **Test fixture page** — to enable the 6 skipped Playwright interaction tests, add a page at `/test-fixture/tv-card` that renders a TV `MovieCard` without auth (dev/test env only).
