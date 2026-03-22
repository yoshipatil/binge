import Image from "next/image"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import {
  getMovieDetails,
  getTVDetails,
  getMovieRecommendations,
  getTVRecommendations,
  getPosterUrl,
  getBackdropUrl,
  getWatchProviders,
  getProviderLogoUrl,
} from "@/lib/tmdb"
import { normalizeEloScores } from "@/lib/elo"
import { getTier } from "@/lib/tiers"
import MovieCard from "@/components/MovieCard"
import RateMovieDialog from "@/components/RateMovieDialog"
import WatchlistButton from "@/components/WatchlistButton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Clock, Calendar, Tv } from "lucide-react"
import { getTitle, getReleaseYear, getMediaType, type MediaType } from "@/types"

interface MoviePageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}

export default async function MoviePage({ params, searchParams }: MoviePageProps) {
  const { id } = await params
  const { type } = await searchParams
  const mediaType = (type === "tv" ? "tv" : "movie") as "movie" | "tv"

  // Fetch movie details, user rating, recommendations, and watch providers in parallel
  let movie, existingRating, recommendations, watchProviders
  try {
    ;[movie, existingRating, recommendations, watchProviders] = await Promise.all([
      mediaType === "tv" ? getTVDetails(Number(id)) : getMovieDetails(Number(id)),
      prisma.rating.findFirst({ where: { tmdbId: Number(id) } }),
      mediaType === "tv"
        ? getTVRecommendations(Number(id))
        : getMovieRecommendations(Number(id)),
      getWatchProviders(Number(id), mediaType),
    ])
  } catch {
    notFound()
  }

  // Get normalized display score if rated
  let displayScore: number | undefined
  if (existingRating) {
    const allRatingsForType = await prisma.rating.findMany({
      where: { mediaType: existingRating.mediaType },
    })
    const normalized = normalizeEloScores(allRatingsForType)
    const found = normalized.find((r) => r.tmdbId === Number(id))
    displayScore = found?.displayScore
  }

  const isInWatchlist = !!(await prisma.watchlist.findFirst({
    where: { tmdbId: Number(id) },
  }))

  const title = getTitle(movie)
  const year = getReleaseYear(movie)
  const appMediaType: MediaType = getMediaType({ ...movie, media_type: mediaType })
  const tier = displayScore !== undefined ? getTier(displayScore) : null

  // Filter recs to only movies/shows with posters
  const recResults = (recommendations?.results ?? [])
    .filter((r) => r.poster_path)
    .slice(0, 10)

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      {movie.backdrop_path && (
        <div className="relative h-64 w-full overflow-hidden sm:h-80">
          <Image
            src={getBackdropUrl(movie.backdrop_path)}
            alt={title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex gap-6">
          {/* Poster */}
          <div className="relative hidden flex-shrink-0 sm:block">
            <div className="relative h-60 w-40 overflow-hidden rounded-lg shadow-xl">
              <Image
                src={getPosterUrl(movie.poster_path, "w342")}
                alt={title}
                fill
                className="object-cover"
              />
            </div>
            {displayScore !== undefined && tier && (
              <div
                className={`absolute -bottom-3 -right-3 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-lg ${tier.color} ${tier.text}`}
              >
                {displayScore.toFixed(1)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {movie.runtime}m
                  </span>
                )}
                {movie.number_of_seasons && (
                  <span className="flex items-center gap-1">
                    <Tv className="h-3.5 w-3.5" />
                    {movie.number_of_seasons} seasons
                  </span>
                )}
              </div>
            </div>

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {movie.genres.map((g) => (
                  <Badge key={g.id} variant="secondary" className="text-xs">
                    {g.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Tier badge if rated */}
            {displayScore !== undefined && tier && (
              <div className="flex items-center gap-2">
                <Badge className={`${tier.color} ${tier.text} border-0 px-3 py-1`}>
                  {tier.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  #{displayScore.toFixed(1)} in your list
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <RateMovieDialog
                movie={movie}
                mediaType={appMediaType}
                trigger={
                  <Button size="sm" className="gap-2">
                    <Star className="h-4 w-4" />
                    {existingRating ? "Re-rank" : "Rate This"}
                  </Button>
                }
              />
              <WatchlistButton
                tmdbId={movie.id}
                mediaType={appMediaType}
                initialInWatchlist={isInWatchlist}
              />
            </div>

            {/* Where to watch */}
            {watchProviders?.flatrate && watchProviders.flatrate.length > 0 && (
              <div className="mt-1">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
                  Stream on
                </p>
                <div className="flex flex-wrap gap-2">
                  {watchProviders.flatrate.map((p) => (
                    <div
                      key={p.provider_id}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
                      title={p.provider_name}
                    >
                      <Image
                        src={getProviderLogoUrl(p.logo_path)}
                        alt={p.provider_name}
                        width={20}
                        height={20}
                        className="rounded"
                      />
                      <span className="text-xs text-white/70">{p.provider_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rent/Buy if no streaming */}
            {!watchProviders?.flatrate?.length && (watchProviders?.rent?.length || watchProviders?.buy?.length) && (
              <div className="mt-1">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
                  Rent or buy on
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...(watchProviders.rent ?? []), ...(watchProviders.buy ?? [])]
                    .filter((p, i, arr) => arr.findIndex(x => x.provider_id === p.provider_id) === i)
                    .map((p) => (
                      <div
                        key={p.provider_id}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5"
                      >
                        <Image
                          src={getProviderLogoUrl(p.logo_path)}
                          alt={p.provider_name}
                          width={20}
                          height={20}
                          className="rounded"
                        />
                        <span className="text-xs text-white/70">{p.provider_name}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {movie.overview}
              </p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recResults.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-lg font-semibold">More Like This</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {recResults.map((rec) => {
                const recMediaType = getMediaType({ ...rec, media_type: mediaType })
                return (
                  <MovieCard
                    key={rec.id}
                    movie={rec}
                    mediaType={recMediaType}
                    actions={
                      <RateMovieDialog
                        movie={rec}
                        mediaType={recMediaType}
                        trigger={
                          <Button size="sm" className="h-7 w-full gap-1 text-xs">
                            <Star className="h-3 w-3" />
                            Rate
                          </Button>
                        }
                      />
                    }
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
