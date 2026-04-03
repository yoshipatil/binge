"use client"

import { useRef } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import SeasonTab from "./SeasonTab"

interface Season {
  season_number: number
  episode_count: number
  name: string
}

interface SeasonTabBarProps {
  seasons: Season[]
  activeSeason: number
  watchedPerSeason: Record<number, number>
  showTmdbId: number
  isLoading: boolean
  onSeasonChange: (seasonNumber: number) => void
}

export default function SeasonTabBar({
  seasons,
  activeSeason,
  watchedPerSeason,
  showTmdbId,
  isLoading,
  onSeasonChange,
}: SeasonTabBarProps) {
  const tabListRef = useRef<HTMLDivElement>(null)

  // Sort: non-specials first, specials (season 0) last
  const sortedSeasons = [...seasons].sort((a, b) => {
    if (a.season_number === 0) return 1
    if (b.season_number === 0) return -1
    return a.season_number - b.season_number
  })

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const tabs = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    if (!tabs) return

    let nextIndex = index
    if (e.key === "ArrowRight") {
      e.preventDefault()
      nextIndex = (index + 1) % tabs.length
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      nextIndex = (index - 1 + tabs.length) % tabs.length
    } else if (e.key === "Home") {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === "End") {
      e.preventDefault()
      nextIndex = tabs.length - 1
    } else {
      return
    }

    tabs[nextIndex]?.focus()
    onSeasonChange(sortedSeasons[nextIndex].season_number)
  }

  if (isLoading) {
    return (
      <div className="mb-3 flex gap-2">
        {[60, 80, 60].map((w, i) => (
          <Skeleton key={i} className={`h-7 rounded-full bg-white/[0.06]`} style={{ width: w }} />
        ))}
      </div>
    )
  }

  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Seasons"
      className="mb-3 flex gap-2 overflow-x-auto touch-pan-x pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {sortedSeasons.map((season, index) => (
        <SeasonTab
          key={season.season_number}
          seasonNumber={season.season_number}
          watchedInSeason={watchedPerSeason[season.season_number] ?? 0}
          totalInSeason={season.episode_count}
          isActive={activeSeason === season.season_number}
          tabId={`season-tab-${showTmdbId}-${season.season_number}`}
          panelId={`season-content-${showTmdbId}-${season.season_number}`}
          onClick={() => onSeasonChange(season.season_number)}
          onKeyDown={(e) => handleKeyDown(e, index)}
        />
      ))}
    </div>
  )
}
