"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { useReducedMotion, AnimatePresence, motion } from "framer-motion"
import { ListVideo, ChevronUp, CheckCheck, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"
import SeasonTabBar from "./SeasonTabBar"
import EpisodeList from "./EpisodeList"
import type { TMDBEpisode, TMDBMovie } from "@/types"

interface WatchedEntry {
  seasonNum: number
  episodeNum: number
  watchedAt: string
}

interface WatchedData {
  watched: WatchedEntry[]
  perSeason: Record<number, number>
}

interface EpisodePanelProps {
  show: TMDBMovie
  showTmdbId: number
  showTitle: string
  initialPerSeason?: Record<number, number>
  onWatchedChange?: (showTmdbId: number, perSeason: Record<number, number>) => void
  /** When true, panel starts open with no toggle button — used on the show detail page */
  defaultOpen?: boolean
}

function recomputePerSeason(watched: WatchedEntry[]): Record<number, number> {
  const map: Record<number, number> = {}
  for (const w of watched) {
    map[w.seasonNum] = (map[w.seasonNum] ?? 0) + 1
  }
  return map
}

export default function EpisodePanel({
  show,
  showTmdbId,
  showTitle,
  initialPerSeason,
  onWatchedChange,
  defaultOpen = false,
}: EpisodePanelProps) {
  const shouldReduceMotion = useReducedMotion()
  const triggerRef = useRef<HTMLButtonElement>(null)

  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [activeSeason, setActiveSeason] = useState<number | null>(null)
  const [watchedData, setWatchedData] = useState<WatchedData | null>(
    initialPerSeason
      ? { watched: [], perSeason: initialPerSeason }
      : null
  )
  const [seasonEpisodes, setSeasonEpisodes] = useState<Record<number, TMDBEpisode[]>>({})
  const [loadingSeasons, setLoadingSeasons] = useState<Set<number>>(new Set())
  const [watchedFetchState, setWatchedFetchState] = useState<
    "idle" | "loading" | "error" | "done"
  >(initialPerSeason ? "done" : "idle")
  const [statusMessage, setStatusMessage] = useState("")

  // Filter seasons: non-specials first, specials last
  const availableSeasons = useMemo(() => {
    if (!show.seasons) return []
    return show.seasons.filter(s => s.season_number >= 0)
  }, [show.seasons])

  const firstNonSpecialSeason = useMemo(() => {
    return availableSeasons
      .filter(s => s.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number)[0]?.season_number ?? null
  }, [availableSeasons])

  const watchedSet = useMemo(
    () =>
      new Set(
        watchedData?.watched.map(e => `${e.seasonNum}:${e.episodeNum}`) ?? []
      ),
    [watchedData]
  )

  const fetchWatchedData = useCallback(async () => {
    if (watchedFetchState === "loading" || watchedFetchState === "done") return
    setWatchedFetchState("loading")
    try {
      const res = await fetch(`/api/episodes/watched?showId=${showTmdbId}`)
      if (!res.ok) throw new Error("fetch failed")
      const data: WatchedData = await res.json()
      setWatchedData(data)
      setWatchedFetchState("done")
    } catch {
      setWatchedFetchState("error")
    }
  }, [showTmdbId, watchedFetchState])

  const fetchSeasonEpisodes = useCallback(
    async (seasonNum: number) => {
      if (seasonEpisodes[seasonNum] !== undefined || loadingSeasons.has(seasonNum)) return
      setLoadingSeasons(prev => new Set(prev).add(seasonNum))
      try {
        const res = await fetch(
          `/api/episodes/season?showId=${showTmdbId}&season=${seasonNum}`
        )
        if (!res.ok) throw new Error("season fetch failed")
        const data = await res.json()
        setSeasonEpisodes(prev => ({
          ...prev,
          [seasonNum]: data.episodes ?? [],
        }))
      } catch {
        // Leave season as undefined so user can retry by switching tab
        setSeasonEpisodes(prev => ({ ...prev, [seasonNum]: [] }))
      } finally {
        setLoadingSeasons(prev => {
          const next = new Set(prev)
          next.delete(seasonNum)
          return next
        })
      }
    },
    [showTmdbId, seasonEpisodes, loadingSeasons]
  )

  // When defaultOpen=true, trigger fetch + set season immediately on mount
  useEffect(() => {
    if (defaultOpen) {
      if (watchedFetchState === "idle") fetchWatchedData()
      if (activeSeason === null && firstNonSpecialSeason !== null) {
        setActiveSeason(firstNonSpecialSeason)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpen])

  // When panel opens, fetch watched data and set active season
  const handleToggleOpen = () => {
    const opening = !isOpen
    setIsOpen(opening)

    if (opening) {
      if (watchedFetchState === "idle") {
        fetchWatchedData()
      }
      if (activeSeason === null && firstNonSpecialSeason !== null) {
        setActiveSeason(firstNonSpecialSeason)
      }
    } else {
      // Focus trigger when closing
      setTimeout(() => triggerRef.current?.focus(), 50)
    }
  }

  // When active season changes, fetch its episodes
  useEffect(() => {
    if (activeSeason !== null && seasonEpisodes[activeSeason] === undefined) {
      fetchSeasonEpisodes(activeSeason)
    }
  }, [activeSeason]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus first tab when panel opens and data is ready
  useEffect(() => {
    if (isOpen && watchedFetchState === "done" && activeSeason !== null) {
      const tabEl = document.getElementById(
        `season-tab-${showTmdbId}-${activeSeason}`
      )
      tabEl?.focus()
    }
  }, [isOpen, watchedFetchState]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSeasonChange = (seasonNum: number) => {
    setActiveSeason(seasonNum)
  }

  const handleToggleEpisode = useCallback(
    async (ep: TMDBEpisode) => {
      if (!watchedData) return

      const prevData = watchedData
      const isWatched = watchedSet.has(`${ep.season_number}:${ep.episode_number}`)

      // Optimistic update
      const newWatched = isWatched
        ? watchedData.watched.filter(
            w => !(w.seasonNum === ep.season_number && w.episodeNum === ep.episode_number)
          )
        : [
            ...watchedData.watched,
            {
              seasonNum: ep.season_number,
              episodeNum: ep.episode_number,
              watchedAt: new Date().toISOString(),
            },
          ]

      const newPerSeason = recomputePerSeason(newWatched)
      setWatchedData({ watched: newWatched, perSeason: newPerSeason })
      onWatchedChange?.(showTmdbId, newPerSeason)

      // Announce to screen reader
      const msg = isWatched
        ? `Episode ${ep.episode_number} unmarked`
        : `Episode ${ep.episode_number} marked as watched`
      setStatusMessage(msg)
      setTimeout(() => setStatusMessage(""), 3000)

      // Fire API
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
            body: JSON.stringify({
              showTmdbId,
              seasonNum: ep.season_number,
              episodeNum: ep.episode_number,
            }),
          })
          if (!res.ok) throw new Error("mark failed")
        }
      } catch {
        // Rollback
        setWatchedData(prevData)
        onWatchedChange?.(showTmdbId, prevData.perSeason)
        toast.error("Couldn't update episode — try again")
      }
    },
    [watchedData, watchedSet, showTmdbId, onWatchedChange]
  )

  const handleMarkAllWatched = useCallback(async () => {
    if (!watchedData || activeSeason === null) return
    const episodes = seasonEpisodes[activeSeason]
    if (!episodes) return

    const unwatched = episodes.filter(
      ep => !watchedSet.has(`${ep.season_number}:${ep.episode_number}`)
    )
    if (unwatched.length === 0) return

    const prevData = watchedData

    // Optimistic update — mark all unwatched
    const newWatchedEntries = unwatched.map(ep => ({
      seasonNum: ep.season_number,
      episodeNum: ep.episode_number,
      watchedAt: new Date().toISOString(),
    }))
    const newWatched = [...watchedData.watched, ...newWatchedEntries]
    const newPerSeason = recomputePerSeason(newWatched)
    setWatchedData({ watched: newWatched, perSeason: newPerSeason })
    onWatchedChange?.(showTmdbId, newPerSeason)

    // Fire all POSTs in parallel
    const results = await Promise.allSettled(
      unwatched.map(ep =>
        fetch("/api/episodes/watched", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            showTmdbId,
            seasonNum: ep.season_number,
            episodeNum: ep.episode_number,
          }),
        }).then(res => {
          if (!res.ok) throw new Error(`failed for E${ep.episode_number}`)
          return ep
        })
      )
    )

    // Identify failed episodes and rollback only those
    const failedEps = results
      .map((r, i) => (r.status === "rejected" ? unwatched[i] : null))
      .filter(Boolean) as TMDBEpisode[]

    if (failedEps.length > 0) {
      const rolledBackWatched = newWatched.filter(
        w =>
          !failedEps.some(
            ep => ep.season_number === w.seasonNum && ep.episode_number === w.episodeNum
          )
      )
      const rolledBackPerSeason = recomputePerSeason(rolledBackWatched)
      setWatchedData({ watched: rolledBackWatched, perSeason: rolledBackPerSeason })
      onWatchedChange?.(showTmdbId, rolledBackPerSeason)
      toast.error(`Couldn't mark ${failedEps.length} episode(s) — try again`)
    }

    void prevData // suppress unused warning
  }, [watchedData, activeSeason, seasonEpisodes, watchedSet, showTmdbId, onWatchedChange])

  // Panel animation variants (reduced motion aware)
  const panelVariants = {
    hidden: {
      height: 0,
      opacity: shouldReduceMotion ? 1 : 0,
    },
    visible: {
      height: "auto" as const,
      opacity: 1,
      transition: shouldReduceMotion
        ? { duration: 0.01 }
        : {
            height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
            opacity: { duration: 0.18, ease: "easeOut", delay: 0.06 },
          },
    },
    exit: {
      height: 0,
      opacity: shouldReduceMotion ? 1 : 0,
      transition: shouldReduceMotion
        ? { duration: 0.01 }
        : {
            height: { duration: 0.20, ease: [0.4, 0, 1, 1] as [number, number, number, number] },
            opacity: { duration: 0.12, ease: "easeIn" },
          },
    },
  }

  // Determine if all episodes in active season are watched
  const activeSeasonEpisodes = activeSeason !== null ? seasonEpisodes[activeSeason] : undefined
  const allWatchedInSeason =
    activeSeasonEpisodes != null &&
    activeSeasonEpisodes.length > 0 &&
    activeSeasonEpisodes.every(ep =>
      watchedSet.has(`${ep.season_number}:${ep.episode_number}`)
    )

  const hasSeasons = availableSeasons.filter(s => s.season_number > 0).length > 0

  if (!hasSeasons) return null

  return (
    <div>
      {/* Toggle button — hidden when defaultOpen (detail page mode) */}
      {!defaultOpen && (
        <button
          ref={triggerRef}
          aria-expanded={isOpen}
          aria-controls={`episode-panel-${showTmdbId}`}
          tabIndex={0}
          onClick={handleToggleOpen}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              handleToggleOpen()
            }
          }}
          className={
            isOpen
              ? "mt-0.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-blue-600/40 bg-blue-600/10 text-[11px] font-medium text-blue-400 transition-colors hover:bg-blue-600/15"
              : "mt-0.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.08] bg-transparent text-[11px] font-medium text-white/50 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.98]"
          }
        >
          {isOpen ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Hide Episodes
            </>
          ) : (
            <>
              <ListVideo className="h-3.5 w-3.5" />
              Track Episodes
            </>
          )}
        </button>
      )}

      {/* Screen reader live region for watched state changes */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {statusMessage}
      </div>

      {/* Episode Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="episode-panel"
            id={`episode-panel-${showTmdbId}`}
            aria-label={`Episode tracker for ${showTitle}`}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="overflow-hidden rounded-b-xl border border-t-0 border-white/[0.06] bg-zinc-950"
          >
            <div className="px-3 pb-4 pt-3 md:px-4">
              {/* Error state */}
              {watchedFetchState === "error" ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertCircle className="h-8 w-8 text-white/20" />
                  <p className="text-sm text-white/40">Couldn&apos;t load episode data</p>
                  <button
                    onClick={() => {
                      setWatchedFetchState("idle")
                      fetchWatchedData()
                    }}
                    className="text-xs font-medium text-blue-400 underline-offset-2 hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  {/* Season Tab Bar */}
                  <SeasonTabBar
                    seasons={availableSeasons}
                    activeSeason={activeSeason ?? firstNonSpecialSeason ?? 0}
                    watchedPerSeason={watchedData?.perSeason ?? {}}
                    showTmdbId={showTmdbId}
                    isLoading={watchedFetchState === "loading"}
                    onSeasonChange={handleSeasonChange}
                  />

                  {/* Episode List */}
                  {activeSeason !== null && watchedFetchState !== "loading" && (
                    <EpisodeList
                      activeSeason={activeSeason}
                      episodes={seasonEpisodes[activeSeason]}
                      isLoading={loadingSeasons.has(activeSeason)}
                      watchedSet={watchedSet}
                      showTmdbId={showTmdbId}
                      onToggle={handleToggleEpisode}
                    />
                  )}

                  {/* Mark All button */}
                  {activeSeason !== null &&
                    watchedFetchState === "done" &&
                    !loadingSeasons.has(activeSeason) &&
                    activeSeasonEpisodes &&
                    activeSeasonEpisodes.length > 0 && (
                      <button
                        onClick={handleMarkAllWatched}
                        className={
                          allWatchedInSeason
                            ? "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-green-600/30 bg-green-600/10 text-sm font-medium text-green-500 transition-colors hover:bg-green-600/15 active:scale-[0.98]"
                            : "mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-transparent text-sm font-medium text-white/50 transition-colors hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white/80 active:scale-[0.98]"
                        }
                      >
                        <CheckCheck
                          className={`h-4 w-4 ${allWatchedInSeason ? "text-green-400" : ""}`}
                        />
                        {allWatchedInSeason ? "All watched" : "Mark all watched"}
                      </button>
                    )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
