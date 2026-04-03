# TV Episode Tracking — UX/Design Spec

_Design spec only. Implementation agent builds exactly what is described here with no additional design decisions._

---

## 1. Component Tree

```
src/components/episodes/
├── EpisodeProgressPill.tsx          ← inline pill on TV card (no expansion)
├── EpisodePanel.tsx                 ← expandable panel below TV card, orchestrator
├── SeasonTabBar.tsx                 ← horizontal scroll row of season tab pills
├── SeasonTab.tsx                    ← single season tab pill (S1 · 8/10)
├── EpisodeList.tsx                  ← scrollable list of episode rows for active season
├── EpisodeRow.tsx                   ← single episode: still + metadata + watched toggle
├── EpisodeRowSkeleton.tsx           ← shimmer placeholder while season loads
└── EpisodeListEmpty.tsx             ← empty state when season has zero episodes
```

These components are consumed by:
- `src/components/MovieCard.tsx` — receives `actions` prop; for TV shows the actions slot includes a "Track Episodes" button that triggers `EpisodePanel`
- Any watchlist card that renders TV items (same pattern via `actions` prop)

---

## 2. Surface 1 — Progress Pill (`EpisodeProgressPill`)

### Purpose
Compact, always-visible indicator on every TV card showing overall watch progress. It must not clutter the card — it sits below the title/year line, replacing the empty space that currently exists for non-TV media. Only rendered when `mediaType === "tv"`.

### Layout
```
[  ▶  3 / 42 eps  ░░░░░░░░░░░░░░░░  7%  ]
```
Single line. Left icon → watched/total text → progress bar → percentage. Full width of the card info area.

### Tailwind classes — `EpisodeProgressPill`

Outer wrapper:
```
className="mt-1.5 flex items-center gap-1.5 px-0"
```

Play circle icon (Lucide `PlayCircle`, 12×12):
```
className="h-3 w-3 shrink-0 text-blue-500"
```

Watched/total text:
```
className="shrink-0 text-[10px] tabular-nums text-white/40"
```
Renders: `{totalWatched} / {totalEpisodes} eps`

Progress bar track:
```
className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]"
```

Progress bar fill (inline style for dynamic width):
```
className="h-full rounded-full bg-blue-600 transition-all duration-300"
style={{ width: `${pct}%` }}
```

Percentage label:
```
className="shrink-0 text-[10px] tabular-nums text-white/30"
```
Renders: `{pct}%`

### Visibility rule
- If `totalEpisodes === 0`: render nothing (null).
- If `totalWatched === 0`: render pill with 0% — still useful to know tracking is available.
- The pill is always mounted (not behind a toggle) — it is passive information.

### Where it mounts in `MovieCard`
In the info `<div>` between the year/tier row and the actions slot:
```tsx
{mediaType === "tv" && (
  <EpisodeProgressPill
    totalWatched={episodeStats.totalWatched}
    totalEpisodes={episodeStats.totalEpisodes}
  />
)}
```
`episodeStats` is passed down from the parent rankings/watchlist page, which fetches `/api/episodes/watched?showId={tmdbId}` once per TV item.

---

## 3. Surface 2 — Track Episodes Button

A secondary action button placed in the `actions` slot of `MovieCard`, rendered only for `mediaType === "tv"`.

### Tailwind classes — button (closed state)
```
className="mt-0.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-transparent text-[11px] font-medium text-white/50 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.98]"
```

Icon: Lucide `ListVideo`, `className="h-3.5 w-3.5"`, color inherits from text.

Label: `"Track Episodes"` — no truncation needed at card widths.

### Open state (panel is expanded)
```
className="mt-0.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-600/10 text-[11px] font-medium text-blue-400 transition-colors hover:bg-blue-600/15"
```
Icon: Lucide `ChevronUp`, `className="h-3.5 w-3.5"`. This replaces `ListVideo` only in the open state.

Label: `"Hide Episodes"`

---

## 4. Surface 3 — Episode Panel (`EpisodePanel`)

### Positioning
The panel is NOT a modal or overlay. It renders as a full-width block **immediately below the TV card** in the grid/list flow, spanning the full column width. On mobile (single-column) it spans 100% viewport width. On desktop (multi-column grid) it spans only its column.

The parent rankings/watchlist list is a staggered grid. The panel is an additional sibling element inserted after the card in DOM order, taking up its own row if needed — implemented via CSS `grid-column: span 1` in a single-column mobile layout, or via a dedicated full-width row at desktop. See Section 8 for exact layout mechanics.

### Outer container — `EpisodePanel`
```
className="overflow-hidden rounded-b-xl border border-t-0 border-white/[0.06] bg-zinc-950"
```
No top border (visually continues from the card above).

### Animation — `EpisodePanel` expand/collapse
Uses `framer-motion` `AnimatePresence` + `motion.div`. The panel mounts/unmounts; height animates from 0 to auto.

```tsx
// variants
const panelVariants = {
  hidden: {
    height: 0,
    opacity: 0,
  },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.18, ease: "easeOut", delay: 0.06 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.20, ease: [0.4, 0, 1, 1] },
      opacity: { duration: 0.12, ease: "easeIn" },
    },
  },
}
```

Usage:
```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      key="episode-panel"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="overflow-hidden rounded-b-xl border border-t-0 border-white/[0.06] bg-zinc-950"
    >
      {/* panel content */}
    </motion.div>
  )}
</AnimatePresence>
```

Important: `overflow-hidden` on the `motion.div` is what creates the clip effect as height animates. The inner content must not have top/bottom margin that bleeds outside — use padding instead.

### Panel inner padding
```
className="px-3 pb-4 pt-3"
```
Mobile: `px-3`. Desktop: `px-4`.

---

## 5. Surface 4 — Season Tab Bar (`SeasonTabBar`)

### Layout
Horizontal scrollable row of tab pills. No scrollbar visible. Overflows horizontally when there are many seasons.

Outer wrapper:
```
className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
```

### "Mark Season" button (inside SeasonTabBar, right end)
A separate affordance — explained in Section 9.

---

## 6. Surface 5 — Season Tab (`SeasonTab`)

### Anatomy
Single pill. Shows: `S{n}` season number, separator dot `·`, watched count out of total.

Example: `S1 · 8/10`

If the season is Season 0 (Specials): label reads `Specials` (no `·` suffix — just the name, no count needed in label). It still shows progress if any exist.

### Tailwind classes — inactive state
```
className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 transition-all duration-150 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white/70 active:scale-[0.97]"
```

### Tailwind classes — active state
```
className="flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full border border-blue-600/50 bg-blue-600/15 px-3 py-1.5 text-xs font-medium text-blue-400 transition-all duration-150"
```

### Season number text
```
className="font-semibold"
```
Renders: `S{season_number}` (or `Specials` for season 0).

### Separator dot (inactive)
```
className="text-white/20"
```

### Separator dot (active)
```
className="text-blue-400/50"
```

### Watched count text (inactive)
```
className="tabular-nums text-white/35"
```

### Watched count text (active)
```
className="tabular-nums text-blue-300/80"
```

Renders: `{watchedInSeason}/{totalInSeason}` — NO spaces around the slash. Example: `8/10`.

### Completion indicator
If `watchedInSeason === totalInSeason && totalInSeason > 0`: render a Lucide `CheckCircle2` icon `h-3 w-3` to the right of the count. Inactive color: `text-green-500/60`. Active color: `text-green-400`.

### Animation — tab switch
No heavy animation on tab switch. The active tab changes highlight immediately (CSS `transition-all duration-150`). The episode list below cross-fades on season change:

```tsx
// In EpisodeList, key the list by seasonNum so AnimatePresence re-mounts
<AnimatePresence mode="wait">
  <motion.div
    key={`season-${activeSeason}`}
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -4 }}
    transition={{ duration: 0.18, ease: "easeOut" }}
  >
    {/* episode list content */}
  </motion.div>
</AnimatePresence>
```

---

## 7. "Mark All" Button

Placed at the **bottom** of the panel, below the episode list. Full width. Secondary style.

### Tailwind classes — not all watched
```
className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-transparent text-sm font-medium text-white/50 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.98]"
```
Icon: Lucide `CheckCheck`, `className="h-4 w-4"`. Label: `"Mark all watched"`.

### Tailwind classes — all episodes in season are watched
```
className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-green-600/30 bg-green-600/10 text-sm font-medium text-green-500 transition-colors hover:bg-green-600/15 active:scale-[0.98]"
```
Icon: Lucide `CheckCheck`, `className="h-4 w-4 text-green-400"`. Label: `"All watched"`.

### Behavior
On tap: immediately mark all unwatched episodes in the season as watched (optimistic update). Fires one `POST /api/episodes/watched` per unwatched episode in parallel. On any individual failure: toast error + roll back only the failed episodes. Do not block UI during the sequence.

---

## 8. Surface 6 — Episode List (`EpisodeList` + `EpisodeRow`)

### List container
```
className="flex flex-col divide-y divide-white/[0.04]"
```

### `EpisodeRow` — full spec

#### Outer wrapper
```
className="group flex min-h-[64px] cursor-pointer items-start gap-3 py-2.5 transition-colors hover:bg-white/[0.02] active:bg-white/[0.04]"
```
Touch target: `min-h-[64px]`. The entire row is the tap target for toggling watched state (not just the checkmark).

`aria-label`: `"Episode {episode_number}: {name}, {watchedState}"` where `watchedState` is `"watched"` or `"not watched"`. Example: `"Episode 3: The One Who Knocks, watched"`.

`role="button"` on outer wrapper. `tabIndex={0}`. `onKeyDown` fires toggle on `Enter` and `Space`.

#### Still image area
Fixed width, never flex-shrinks:
```
className="relative h-[54px] w-[96px] shrink-0 overflow-hidden rounded-md bg-zinc-800"
```

When `still_path` is not null, render `next/image`:
```tsx
<Image
  src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
  alt={`Still from ${episode.name}`}
  fill
  sizes="96px"
  className="object-cover"
/>
```

When `still_path` is null, render placeholder:
```
className="flex h-full w-full items-center justify-center"
```
Icon: Lucide `Clapperboard`, `className="h-5 w-5 text-white/[0.12]"`.

#### Episode number badge (absolute, top-left corner of still)
```
className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white/70 backdrop-blur-sm"
```
Renders: `E{episode_number}` — example: `E3`.

#### Metadata column (flex-1)
```
className="flex flex-1 flex-col gap-0.5 pt-0.5"
```

Episode title:
```
className="line-clamp-2 text-[13px] font-medium leading-snug text-white/85 transition-colors group-hover:text-white"
```

Secondary metadata line (air_date + runtime):
```
className="flex items-center gap-1.5 text-[11px] text-white/35"
```

Air date text: formatted as `"Jan 20, 2008"` — use `new Date(air_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })`. If `air_date` is null: render nothing for that segment.

Separator dot between air_date and runtime (only when both present):
```
className="text-white/20"
```
Renders: `·`

Runtime text: `"{n}m"` — example: `"58m"`. If `runtime` is null or 0: omit entirely.

#### Watched toggle (right side)
```
className="flex shrink-0 items-center self-center pl-1"
```

Toggle button itself (not the row wrapper — this is an explicit button for keyboard/screen-reader users who tab to it directly):
```
className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.88]"
```
`aria-label`: `"Mark episode {episode_number} as {watched ? 'unwatched' : 'watched'}"`.
`aria-pressed`: `{watched}`.

Unwatched icon state — Lucide `Circle`:
```
className="h-5 w-5 text-white/20 transition-colors group-hover:text-white/35"
```

Watched icon state — Lucide `CheckCircle2`:
```
className="h-5 w-5 text-blue-500"
```

#### Watched toggle animation
The icon swap uses `AnimatePresence` with `mode="wait"`:
```tsx
<AnimatePresence mode="wait" initial={false}>
  {watched ? (
    <motion.div
      key="checked"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      <CheckCircle2 className="h-5 w-5 text-blue-500" />
    </motion.div>
  ) : (
    <motion.div
      key="unchecked"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ duration: 0.12, ease: "easeIn" }}
    >
      <Circle className="h-5 w-5 text-white/20 transition-colors group-hover:text-white/35" />
    </motion.div>
  )}
</AnimatePresence>
```

#### Watched row visual state
When episode is watched, the entire row receives a left accent border:
```
// Watched
className="group flex min-h-[64px] cursor-pointer items-start gap-3 border-l-2 border-blue-600/40 py-2.5 pl-2 transition-colors hover:bg-white/[0.02] active:bg-white/[0.04]"

// Unwatched (default)
className="group flex min-h-[64px] cursor-pointer items-start gap-3 border-l-2 border-transparent py-2.5 pl-2 transition-colors hover:bg-white/[0.02] active:bg-white/[0.04]"
```
This left border transition happens with `transition-colors duration-200`.

---

## 9. State Management

### Where state lives

All episode tracking state lives in `EpisodePanel` (the orchestrator component). It is NOT lifted to the page level. Each TV card manages its own panel independently.

```ts
// EpisodePanel internal state
const [isOpen, setIsOpen] = useState(false)
const [activeSeason, setActiveSeason] = useState<number | null>(null)
// null = no season selected yet; set to first non-zero season on panel open

const [watchedData, setWatchedData] = useState<{
  watched: { seasonNum: number; episodeNum: number; watchedAt: string }[]
  perSeason: Record<number, number>
} | null>(null)
// null = not yet fetched

const [seasonEpisodes, setSeasonEpisodes] = useState<
  Record<number, TMDBEpisode[]>
>({})
// keyed by season_number, populated lazily on tab open

const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set())
// season numbers currently being fetched from /api/episodes/season

const [watchedFetchState, setWatchedFetchState] = useState<
  "idle" | "loading" | "error" | "done"
>("idle")
```

### EpisodeProgressPill state (lifted higher)

`EpisodeProgressPill` needs `totalWatched` and `totalEpisodes`. These come from `perSeason` (fetched once by the parent page for all TV items). The parent page (rankings/watchlist page) fetches `/api/episodes/watched?showId={tmdbId}` once per TV item during initial page load and passes `{ perSeason, totalEpisodes }` down as props. This avoids each card fetching independently.

The pill re-renders optimistically when `EpisodePanel` updates watched state — the panel calls an `onWatchedChange(showTmdbId, perSeason)` callback prop that the parent page uses to update its local map.

### Fetch lifecycle in `EpisodePanel`

1. User taps "Track Episodes" → `isOpen` flips to `true`.
2. On first open (if `watchedFetchState === "idle"`): fire `GET /api/episodes/watched?showId={tmdbId}` → set `watchedData`, set `watchedFetchState = "done"`. Also set `activeSeason` to first `season_number > 0`.
3. When `activeSeason` changes (user taps a season tab) and `seasonEpisodes[activeSeason]` is not yet populated: fire `GET /api/episodes/season?showId={tmdbId}&season={activeSeason}` → push to `setLoadingSeasons`, on response remove from loading set and populate `seasonEpisodes`.
4. Subsequent opens reuse cached `watchedData` and `seasonEpisodes` — no re-fetch.

### Optimistic update — single episode toggle

When user taps an episode row (or its toggle button):

```ts
// 1. Read current state
const isWatched = watchedSet.has(`${ep.season_number}:${ep.episode_number}`)

// 2. Compute optimistic new state
const newWatched = isWatched
  ? watchedData.watched.filter(
      w => !(w.seasonNum === ep.season_number && w.episodeNum === ep.episode_number)
    )
  : [...watchedData.watched, { seasonNum: ep.season_number, episodeNum: ep.episode_number, watchedAt: new Date().toISOString() }]

const newPerSeason = recomputePerSeason(newWatched)

// 3. Apply optimistic update immediately
setWatchedData({ watched: newWatched, perSeason: newPerSeason })
onWatchedChange(showTmdbId, newPerSeason)  // updates pill in parent

// 4. Fire API
try {
  if (isWatched) {
    const res = await fetch(
      `/api/episodes/watched?showId=${showTmdbId}&seasonNum=${ep.season_number}&episodeNum=${ep.episode_number}`,
      { method: "DELETE" }
    )
    if (!res.ok) throw new Error("unmark failed")
  } else {
    const res = await fetch("/api/episodes/watched", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showTmdbId, seasonNum: ep.season_number, episodeNum: ep.episode_number }),
    })
    if (!res.ok) throw new Error("mark failed")
  }
} catch {
  // 5. Rollback
  setWatchedData({ watched: watchedData.watched, perSeason: watchedData.perSeason })
  onWatchedChange(showTmdbId, watchedData.perSeason)
  toast.error("Couldn't update episode — try again")
}
```

`recomputePerSeason` is a local helper:
```ts
function recomputePerSeason(watched: { seasonNum: number }[]): Record<number, number> {
  const map: Record<number, number> = {}
  for (const w of watched) {
    map[w.seasonNum] = (map[w.seasonNum] ?? 0) + 1
  }
  return map
}
```

### `watchedSet` — memoized lookup

```ts
const watchedSet = useMemo(
  () => new Set(watchedData?.watched.map(e => `${e.seasonNum}:${e.episodeNum}`) ?? []),
  [watchedData]
)
```

---

## 10. Loading States

### `watchedFetchState === "loading"` (initial panel open)
Show a skeleton version of the full panel:

Season tab bar skeleton — 3 pill-shaped skeletons:
```tsx
<div className="mb-3 flex gap-2">
  {[60, 80, 60].map((w, i) => (
    <Skeleton key={i} className={`h-7 w-[${w}px] rounded-full bg-white/[0.06]`} />
  ))}
</div>
```

Episode list skeleton — 4 rows:
```tsx
// EpisodeRowSkeleton
<div className="flex items-start gap-3 py-2.5">
  <Skeleton className="h-[54px] w-[96px] shrink-0 rounded-md bg-white/[0.06]" />
  <div className="flex flex-1 flex-col gap-2 pt-1">
    <Skeleton className="h-3 w-3/4 rounded bg-white/[0.06]" />
    <Skeleton className="h-2.5 w-1/2 rounded bg-white/[0.06]" />
  </div>
  <Skeleton className="h-5 w-5 shrink-0 self-center rounded-full bg-white/[0.06]" />
</div>
```
Render 4 `EpisodeRowSkeleton` instances separated by `divide-y divide-white/[0.04]`.

### `loadingSeasons.has(activeSeason)` (season tab switched, episodes not yet fetched)
Replace the episode list area with 4 `EpisodeRowSkeleton` instances. The season tab bar stays fully interactive — user can switch to a different tab while one is loading.

### `watchedFetchState === "error"` (watched fetch failed)
Replace entire panel interior with:
```tsx
<div className="flex flex-col items-center gap-3 py-8 text-center">
  <AlertCircle className="h-8 w-8 text-white/20" />
  <p className="text-sm text-white/40">Couldn't load episode data</p>
  <button
    onClick={retryWatchedFetch}
    className="text-xs font-medium text-blue-400 underline-offset-2 hover:underline"
  >
    Try again
  </button>
</div>
```
Icon: Lucide `AlertCircle`.

---

## 11. Empty States

### Season has no episodes (TMDB returned `episodes: []`)
Rendered by `EpisodeListEmpty`:
```tsx
<div className="flex flex-col items-center gap-2 py-8 text-center">
  <Tv className="h-8 w-8 text-white/10" />
  <p className="text-sm text-white/30">No episodes yet</p>
  <p className="text-[11px] text-white/20">Episodes will appear when available</p>
</div>
```
Icon: Lucide `Tv`.

### Show has no seasons data (edge case: `movie.seasons` is undefined or empty)
Do not render "Track Episodes" button or progress pill at all. Guard in `MovieCard`:
```tsx
const hasSeasons = mediaType === "tv" && (movie.seasons?.filter(s => s.season_number > 0).length ?? 0) > 0
```

---

## 12. Mobile Layout (390px)

### `MovieCard` with episode panel
At 390px, the grid is single-column. Cards are full-width. The `EpisodePanel` mounts below the card in normal document flow, full width.

The progress pill text truncates gracefully because it uses `flex-1` for the bar and `shrink-0` on text nodes — the bar compresses, never the text.

### `SeasonTabBar`
Scrolls horizontally. First tab aligns to `px-3` left edge of the panel. No fade-out gradient — the tabs scroll naturally. User can swipe tabs without conflicting with page scroll (tabs scroll horizontally, page scrolls vertically).

`touch-action: pan-x` on the tab bar wrapper — implemented via Tailwind:
```
className="... touch-pan-x"
```

### `EpisodeRow`
At 390px:
- Still image: `96px × 54px` — unchanged.
- Title: `line-clamp-2` prevents overflow.
- Secondary metadata: `air_date` on left, runtime omitted if it causes overflow. Since both are `text-[11px]` and the container is `flex-1`, it fits on one line for typical values.
- Toggle: `h-8 w-8` button always visible — never pushed off-screen.

### Panel inner padding at mobile
```
className="px-3 pb-4 pt-3"
```

### "Mark All" button at mobile
Full width, `h-10` — sufficient touch target.

---

## 13. Desktop Layout (1280px)

### Grid context
Rankings page at 1280px likely uses a multi-column grid (e.g., 5 columns). The episode panel spans only the single column its parent card occupies. It does NOT break out to full width.

Panel `max-h` constraint at desktop:
```
className="max-h-[480px] overflow-y-auto"
```
Applied to the inner scrollable container (the episode list + mark-all button block), not the outer `motion.div`. This prevents a show with 24 episodes from creating an extremely tall panel.

Custom scrollbar on desktop (Tailwind):
```
className="[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]"
```

### `SeasonTabBar` at desktop
Does not scroll horizontally in most cases (≤8 seasons fits inline at desktop column width). Still uses `overflow-x-auto` for safety with long-running shows.

### Panel inner padding at desktop
```
className="px-4 pb-4 pt-3"
```

### `EpisodeRow` at desktop
No layout changes from mobile. The card column width at desktop is narrower (roughly 200–240px wide in a 5-column grid), so the still image proportionally dominates more — this is acceptable and cinematic. The `line-clamp-2` on title still applies.

---

## 14. Accessibility

### Keyboard navigation — `EpisodePanel` trigger button
- `tabIndex={0}`, `role="button"`.
- `onKeyDown`: toggle open/close on `Enter` and `Space`.
- `aria-expanded={isOpen}`.
- `aria-controls="episode-panel-{tmdbId}"`.

### Episode panel container
- `id="episode-panel-{tmdbId}"` — matches `aria-controls` above.
- `aria-label="Episode tracker for {showTitle}"`.

### Season tab bar
- Wrapper: `role="tablist"`, `aria-label="Seasons"`.
- Each `SeasonTab`: `role="tab"`, `aria-selected={isActive}`, `aria-controls="season-content-{tmdbId}-{seasonNum}"`.
- Keyboard: `ArrowLeft`/`ArrowRight` navigate between tabs. `Home`/`End` jump to first/last. Focus wraps.
- `tabIndex`: active tab = 0, inactive tabs = -1 (roving tabindex pattern).

### Episode list
- Wrapper: `role="tabpanel"`, `id="season-content-{tmdbId}-{seasonNum}"`.
- `aria-labelledby` points to the active season tab.
- `aria-live="polite"` on the list wrapper — screen readers announce when season content loads.

### Episode row
- `role="button"`, `tabIndex={0}`.
- `aria-label="Episode {n}: {name}, {air_date}, {runtime}m, {watched ? 'watched' : 'not watched'}"`.
- Full label example: `"Episode 3: The One Who Knocks, January 20, 2008, 58 minutes, not watched"`.
- `onKeyDown`: toggle on `Enter` and `Space`.
- The inner toggle button (`CheckCircle2`/`Circle`) has `aria-hidden="true"` and `tabIndex={-1}` — the row wrapper handles all interaction. This avoids double tab stop.

### Focus management
When the panel opens: focus moves to the first `SeasonTab` (`tabIndex={0}`) within the tab list.
When the panel closes: focus returns to the "Track Episodes" trigger button.

Use `useRef` on the trigger button and call `.focus()` in the `AnimatePresence` exit callback.

### `aria-live` for watched state changes
```tsx
<div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
  {statusMessage}
  {/* e.g. "Episode 3 marked as watched" or "Episode 3 unmarked" */}
</div>
```
`statusMessage` is set in the toggle handler. It clears after 3 seconds.

### Reduced motion
All `framer-motion` components check `useReducedMotion()`:
```tsx
const shouldReduceMotion = useReducedMotion()

const panelVariants = {
  hidden: { height: 0, opacity: shouldReduceMotion ? 1 : 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: shouldReduceMotion
      ? { duration: 0.01 }
      : { height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.18, delay: 0.06 } },
  },
  exit: {
    height: 0,
    opacity: shouldReduceMotion ? 1 : 0,
    transition: shouldReduceMotion ? { duration: 0.01 } : { height: { duration: 0.20 }, opacity: { duration: 0.12 } },
  },
}
```
Same pattern applies to `episodeToggleVariants` and `seasonContentVariants`.

---

## 15. Color Token Summary

All colors used in this feature, referenced to the app's existing dark cinematic token set:

| Token | Tailwind class | Usage |
|---|---|---|
| Surface base | `bg-zinc-950` | Panel background |
| Surface hover | `bg-white/[0.02]`, `bg-white/[0.04]` | Row hover/active |
| Border subtle | `border-white/[0.06]`, `border-white/[0.08]` | Panel border, inactive tab border |
| Text primary | `text-white/85`, `text-white/90` | Episode title |
| Text secondary | `text-white/40`, `text-white/35` | Air date, runtime, counts |
| Text tertiary | `text-white/20`, `text-white/30` | Empty states, separator dots |
| Accent blue (primary) | `text-blue-400`, `bg-blue-600/15`, `border-blue-600/50` | Active season tab |
| Accent blue (fill) | `bg-blue-600`, `text-blue-500` | Progress bar fill, watched icon |
| Accent green | `text-green-500`, `text-green-400`, `bg-green-600/10` | All-watched state |
| Skeleton bg | `bg-white/[0.06]` | Loading skeletons |
| Placeholder bg | `bg-zinc-800` | Still image placeholder |

---

## 16. Specials (Season 0) Handling

Season 0 from TMDB is "Specials". Rules:
- In `SeasonTabBar`, Season 0 always renders **last** regardless of its position in the `movie.seasons` array.
- Its tab label is `"Specials"` (not `"S0"`).
- No `·` episode count in the pill label — just `"Specials"`.
- Progress pill on the card (`EpisodeProgressPill`) excludes Season 0 from `totalEpisodes` count — matches the backend spec's `filter(s => s.season_number > 0)` logic.

---

## 17. Component Props Summary

```ts
// EpisodeProgressPill.tsx
interface EpisodeProgressPillProps {
  totalWatched: number   // sum of all perSeason values (excluding season 0)
  totalEpisodes: number  // sum of episode_count for all seasons > 0
}

// EpisodePanel.tsx
interface EpisodePanelProps {
  showTmdbId: number
  showTitle: string                   // for aria-label
  seasons: TMDBMovie["seasons"]       // from getTVDetails, to know how many tabs to render
  onWatchedChange: (showTmdbId: number, perSeason: Record<number, number>) => void
}

// SeasonTabBar.tsx
interface SeasonTabBarProps {
  seasons: { season_number: number; episode_count: number; name: string }[]
  activeSeason: number
  perSeason: Record<number, number>   // for watched counts in tabs
  onSeasonChange: (seasonNum: number) => void
}

// SeasonTab.tsx
interface SeasonTabProps {
  seasonNumber: number
  seasonName: string
  watchedCount: number
  totalCount: number
  isActive: boolean
  onClick: () => void
  tabIndex: number  // for roving tabindex
}

// EpisodeList.tsx
interface EpisodeListProps {
  episodes: TMDBEpisode[]
  watchedSet: Set<string>
  isLoading: boolean
  onToggle: (episode: TMDBEpisode) => void
}

// EpisodeRow.tsx
interface EpisodeRowProps {
  episode: TMDBEpisode
  watched: boolean
  onToggle: () => void
}

// EpisodeRowSkeleton.tsx
// no props

// EpisodeListEmpty.tsx
// no props
```

---

## 18. Implementation Notes (for the build agent)

1. Use `@base-ui/react/tabs` primitives (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) already installed, as seen in `src/components/ui/tabs.tsx`. Do NOT build a custom tab system from scratch. Override the default styling with the class strings in this spec.

2. `framer-motion` is already in the project (used in existing components). Import `{ motion, AnimatePresence, useReducedMotion }` directly.

3. The existing `Skeleton` component at `src/components/ui/skeleton.tsx` uses `animate-pulse`. Use it as the base for all skeleton elements in this feature.

4. `toast.error()` / `toast.success()` from `react-hot-toast` — already used in `MovieCardSheet.tsx`. Use the same import.

5. `next/image` with `fill` and `sizes="96px"` for episode stills. Always pass an explicit `sizes` prop to avoid oversized fetches.

6. The `EpisodePanel` mounts/unmounts on `isOpen` toggle. It does NOT stay mounted in the DOM when closed — this keeps the DOM clean and avoids stale state across cards.

7. Season tab keyboard navigation (roving tabindex): maintain `focusedTabIndex` state in `SeasonTabBar`, sync with `activeSeason`. Arrow keys update `focusedTabIndex` and call `.focus()` on the relevant tab DOM ref via a `refs` array (`useRef<(HTMLButtonElement | null)[]>([])`).

8. The `onWatchedChange` callback from `EpisodePanel` → parent page allows the `EpisodeProgressPill` to update in real-time without a re-fetch. The parent page should store `perSeason` in a `useState` map keyed by `tmdbId`.
