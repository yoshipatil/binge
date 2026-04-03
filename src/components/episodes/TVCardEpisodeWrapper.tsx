"use client"

import { useState, useCallback } from "react"
import MovieCard from "@/components/MovieCard"
import type { TMDBMovie, MediaType } from "@/types"

interface EpisodeStats {
  totalWatched: number
  totalEpisodes: number
  perSeason: Record<number, number>
}

interface TVCardEpisodeWrapperProps {
  movie: TMDBMovie
  mediaType: MediaType
  displayScore?: number
  actions?: React.ReactNode
  initialEpisodeStats: EpisodeStats
}

export default function TVCardEpisodeWrapper({
  movie,
  mediaType,
  displayScore,
  actions,
  initialEpisodeStats,
}: TVCardEpisodeWrapperProps) {
  const [episodeStats, setEpisodeStats] = useState<EpisodeStats>(initialEpisodeStats)

  const handleWatchedChange = useCallback(
    (showTmdbId: number, perSeason: Record<number, number>) => {
      // Recompute totalWatched from perSeason
      const totalWatched = Object.values(perSeason).reduce((a, b) => a + b, 0)
      setEpisodeStats(prev => ({
        ...prev,
        perSeason,
        totalWatched,
      }))
    },
    []
  )

  return (
    <MovieCard
      movie={movie}
      mediaType={mediaType}
      displayScore={displayScore}
      actions={actions}
      episodeStats={episodeStats}
      onWatchedChange={handleWatchedChange}
    />
  )
}
