"use client"

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
  // Passes server-fetched initial stats to the progress pill on the card.
  // Live updates happen on the show detail page — pill refreshes on next page load.
  return (
    <MovieCard
      movie={movie}
      mediaType={mediaType}
      displayScore={displayScore}
      actions={actions}
      episodeStats={initialEpisodeStats}
    />
  )
}
