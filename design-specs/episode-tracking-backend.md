# TV Episode Tracking — Backend Spec

_Written by Lead Agent. Read this before building any UI._

---

## What was built

### New DB model: `WatchedEpisode`
```
userId      String
showTmdbId  Int          ← TMDB show ID (same as Rating.tmdbId where mediaType="tv")
seasonNum   Int
episodeNum  Int
watchedAt   DateTime
@@unique([userId, showTmdbId, seasonNum, episodeNum])
@@index([userId, showTmdbId])
```

### New API routes

#### `GET /api/episodes/watched?showId=123`
Returns all watched episodes for a show + per-season counts.
```json
{
  "watched": [
    { "seasonNum": 1, "episodeNum": 1, "watchedAt": "2026-04-02T..." },
    { "seasonNum": 1, "episodeNum": 2, "watchedAt": "2026-04-02T..." }
  ],
  "perSeason": { "1": 2 }
}
```
Rate limit: 60/min per user.

#### `POST /api/episodes/watched`
Mark an episode watched.
```json
// body
{ "showTmdbId": 123, "seasonNum": 1, "episodeNum": 3 }
// response: created WatchedEpisode row
```
Rate limit: 120/min (users bulk-mark seasons).
Idempotent — marking already-watched episode is a no-op (returns existing row).

#### `DELETE /api/episodes/watched?showId=123&seasonNum=1&episodeNum=3`
Unmark episode. Returns `{ success: true }`.
Rate limit: 120/min.

#### `GET /api/episodes/season?showId=123&season=1`
Proxies TMDB `/tv/{id}/season/{n}`. Returns episode list for a season.
```json
{
  "season_number": 1,
  "name": "Season 1",
  "episodes": [
    {
      "episode_number": 1,
      "season_number": 1,
      "name": "Pilot",
      "overview": "...",
      "still_path": "/abc.jpg",   // null if no thumbnail
      "air_date": "2008-01-20",
      "runtime": 58
    }
  ]
}
```
Rate limit: 30/min. Cached 1hr at TMDB level.

---

## Key facts for UI

- `showTmdbId` comes from the TV show's `Rating.tmdbId` (same number).
- Season 0 may appear in TMDB data — it's "Specials". Show it last if present.
- `still_path` → build thumbnail: `https://image.tmdb.org/t/p/w300{still_path}` (null = no image).
- Use `getTVDetails(showId)` response (already available from existing ratings page) to get `seasons[]` array with `season_number` and `episode_count` — this tells you how many seasons/tabs to render without fetching each season.
- Only fetch a season's episodes on demand (when tab is opened) — lazy load.
- A TV show card already shows `rating.tmdbId` and `mediaType="tv"` — pass those through.

---

## Helper: build watched set for fast lookup

For a given show, convert the `watched[]` array to a Set for O(1) lookup in episode row rendering:
```ts
const watchedSet = new Set(
  watched.map(e => `${e.seasonNum}:${e.episodeNum}`)
)
// usage: watchedSet.has(`${ep.season_number}:${ep.episode_number}`)
```

---

## Progress calculation (do client-side)

```ts
// Per season
const watchedInSeason = perSeason[seasonNum] ?? 0
const totalInSeason = season.episodes.length
const pct = Math.round((watchedInSeason / totalInSeason) * 100)

// Whole show (sum across all seasons shown in tabs)
const totalWatched = Object.values(perSeason).reduce((a, b) => a + b, 0)
const totalEpisodes = show.seasons
  .filter(s => s.season_number > 0)
  .reduce((a, s) => a + s.episode_count, 0)
```

---

## What NOT to build

- No backend for "continue watching" row yet — that's Tier 4
- No per-episode reviews — one-liner reviews are a separate Tier 3 feature
- No friends' watched status — future social feature
