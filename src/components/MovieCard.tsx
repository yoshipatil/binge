"use client"

import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Tv, Film, FileVideo } from "lucide-react"
import { getPosterUrl } from "@/lib/tmdb"
import { getTier } from "@/lib/tiers"
import { getTitle, getReleaseYear, type TMDBMovie, type MediaType } from "@/types"
import EpisodeProgressPill from "@/components/episodes/EpisodeProgressPill"
import EpisodePanel from "@/components/episodes/EpisodePanel"

interface EpisodeStats {
  totalWatched: number
  totalEpisodes: number
  perSeason: Record<number, number>
}

interface MovieCardProps {
  movie: TMDBMovie
  mediaType: MediaType
  displayScore?: number // ELO-normalized score (0–10), undefined if unrated
  actions?: React.ReactNode // optional buttons (Rate, Add to watchlist, etc.)
  // Episode tracking — only used when mediaType === "tv"
  episodeStats?: EpisodeStats
  onWatchedChange?: (showTmdbId: number, perSeason: Record<number, number>) => void
}

const mediaIcons: Record<MediaType, React.ElementType> = {
  movie: Film,
  tv: Tv,
  documentary: FileVideo,
}

const mediaLabels: Record<MediaType, string> = {
  movie: "Movie",
  tv: "TV",
  documentary: "Doc",
}

export default function MovieCard({
  movie,
  mediaType,
  displayScore,
  actions,
  episodeStats,
  onWatchedChange,
}: MovieCardProps) {
  const title = getTitle(movie)
  const year = getReleaseYear(movie)
  const tier = displayScore !== undefined ? getTier(displayScore) : null
  const MediaIcon = mediaIcons[mediaType]

  // Guard: only show episode tracking for TV shows that have at least one non-special season
  const hasSeasons =
    mediaType === "tv" &&
    (movie.seasons?.filter(s => s.season_number > 0).length ?? 0) > 0

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg bg-white/[0.02] transition-all duration-300 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(37,99,235,0.12)]">
      <Link href={`/movie/${movie.id}?type=${mediaType === "documentary" ? "movie" : mediaType}`}>
        {/* Poster */}
        <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
          <Image
            src={getPosterUrl(movie.poster_path)}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          {/* Score badge — bottom right of poster */}
          {displayScore !== undefined && tier && (
            <div
              className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full text-xs font-black shadow-lg ring-1 ring-black/20 ${tier.dotColor}`}
            >
              {displayScore.toFixed(1)}
            </div>
          )}

          {/* Media type badge — top left */}
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 border-0 bg-black/60 text-white/80 text-[10px] backdrop-blur-sm"
            >
              <MediaIcon className="h-2.5 w-2.5" />
              {mediaLabels[mediaType]}
            </Badge>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-1 p-2.5">
        <Link href={`/movie/${movie.id}?type=${mediaType === "documentary" ? "movie" : mediaType}`}>
          <p className="line-clamp-2 text-[13px] font-semibold leading-tight text-white/90 transition-colors group-hover:text-white">
            {title}
          </p>
        </Link>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/35">{year}</span>
          {tier ? (
            <span className={`text-[10px] font-semibold ${tier.text}`}>
              {tier.label}
            </span>
          ) : (
            <span className="text-[10px] text-white/20">Unrated</span>
          )}
        </div>

        {/* Episode progress pill — TV only */}
        {hasSeasons && episodeStats && (
          <EpisodeProgressPill
            totalWatched={episodeStats.totalWatched}
            totalEpisodes={episodeStats.totalEpisodes}
          />
        )}

        {actions && <div className="mt-1.5">{actions}</div>}

        {/* Episode panel — TV only, below actions */}
        {hasSeasons && (
          <EpisodePanel
            show={movie}
            showTmdbId={movie.id}
            showTitle={title}
            initialPerSeason={episodeStats?.perSeason}
            onWatchedChange={onWatchedChange}
          />
        )}
      </div>
    </div>
  )
}
