import Image from "next/image"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tv, Film, FileVideo } from "lucide-react"
import { getPosterUrl } from "@/lib/tmdb"
import { getTier, UNRATED } from "@/lib/tiers"
import { getTitle, getReleaseYear, type TMDBMovie, type MediaType } from "@/types"

interface MovieCardProps {
  movie: TMDBMovie
  mediaType: MediaType
  displayScore?: number // ELO-normalized score (0–10), undefined if unrated
  actions?: React.ReactNode // optional buttons (Rate, Add to watchlist, etc.)
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

export default function MovieCard({ movie, mediaType, displayScore, actions }: MovieCardProps) {
  const title = getTitle(movie)
  const year = getReleaseYear(movie)
  const tier = displayScore !== undefined ? getTier(displayScore) : null
  const MediaIcon = mediaIcons[mediaType]

  return (
    <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/movie/${movie.id}?type=${mediaType === "documentary" ? "movie" : mediaType}`}>
        {/* Poster */}
        <div className="relative aspect-[2/3] w-full bg-muted">
          <Image
            src={getPosterUrl(movie.poster_path)}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-opacity group-hover:opacity-90"
          />

          {/* Score badge — bottom right of poster */}
          {displayScore !== undefined && tier && (
            <div
              className={`absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold shadow-md ${tier.color} ${tier.text}`}
            >
              {displayScore.toFixed(1)}
            </div>
          )}

          {/* Media type badge — top left */}
          <div className="absolute top-2 left-2">
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-black/60 text-white text-xs"
            >
              <MediaIcon className="h-3 w-3" />
              {mediaLabels[mediaType]}
            </Badge>
          </div>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-col gap-1 p-3">
        <Link href={`/movie/${movie.id}?type=${mediaType === "documentary" ? "movie" : mediaType}`}>
          <p className="line-clamp-2 text-sm font-semibold leading-tight hover:underline">
            {title}
          </p>
        </Link>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{year}</span>
          {tier ? (
            <Badge className={`text-xs ${tier.color} ${tier.text} border-0`}>
              {tier.label}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className={`text-xs ${UNRATED.color} ${UNRATED.text} border-0`}
            >
              Unrated
            </Badge>
          )}
        </div>

        {actions && <div className="mt-1">{actions}</div>}
      </div>
    </Card>
  )
}
