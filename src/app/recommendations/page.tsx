import { prisma } from "@/lib/prisma"
import { getMovieRecommendations, getTVRecommendations } from "@/lib/tmdb"
import MovieCard from "@/components/MovieCard"
import RateMovieDialog from "@/components/RateMovieDialog"
import WatchlistButton from "@/components/WatchlistButton"
import { Button } from "@/components/ui/button"
import { getMediaType, type TMDBMovie } from "@/types"
import { Star } from "lucide-react"

export default async function RecommendationsPage() {
  // Get top-rated items per media type (by ELO)
  const [topMovies, topTV] = await Promise.all([
    prisma.rating.findMany({
      where: { mediaType: { in: ["movie", "documentary"] } },
      orderBy: { eloScore: "desc" },
      take: 5,
    }),
    prisma.rating.findMany({
      where: { mediaType: "tv" },
      orderBy: { eloScore: "desc" },
      take: 5,
    }),
  ])

  // Get all rated and watchlisted IDs to filter them out
  const [allRatings, allWatchlist] = await Promise.all([
    prisma.rating.findMany({ select: { tmdbId: true } }),
    prisma.watchlist.findMany({ select: { tmdbId: true } }),
  ])

  const alreadySeen = new Set([
    ...allRatings.map((r) => r.tmdbId),
    ...allWatchlist.map((w) => w.tmdbId),
  ])

  // Fetch TMDB recommendations for each top-rated item
  const [movieRecs, tvRecs] = await Promise.all([
    Promise.all(topMovies.map((r) => getMovieRecommendations(r.tmdbId).catch(() => ({ results: [] })))),
    Promise.all(topTV.map((r) => getTVRecommendations(r.tmdbId).catch(() => ({ results: [] })))),
  ])

  // Deduplicate, filter already-seen, and sort by vote_average
  function processRecs(recLists: { results: TMDBMovie[] }[]): TMDBMovie[] {
    const seen = new Set<number>()
    const results: TMDBMovie[] = []

    recLists.flatMap((r) => r.results).forEach((movie) => {
      if (!seen.has(movie.id) && !alreadySeen.has(movie.id) && movie.poster_path) {
        seen.add(movie.id)
        results.push(movie)
      }
    })

    return results.sort((a, b) => b.vote_average - a.vote_average).slice(0, 20)
  }

  const movieRecommendations = processRecs(movieRecs)
  const tvRecommendations = processRecs(tvRecs)

  const hasAnything = movieRecommendations.length > 0 || tvRecommendations.length > 0
  const hasEnoughRatings = topMovies.length > 0 || topTV.length > 0

  if (!hasEnoughRatings) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <h1 className="mb-2 text-2xl font-bold">For You</h1>
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-4xl">✨</p>
          <p className="text-lg font-semibold">Rate more to unlock recommendations</p>
          <p className="text-sm text-muted-foreground">
            Rate at least a few movies to start getting personalized picks.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">For You</h1>
        <p className="text-sm text-muted-foreground">
          Based on your top-rated titles
        </p>
      </div>

      {!hasAnything && (
        <p className="text-muted-foreground">No new recommendations right now — check back after rating more titles.</p>
      )}

      {movieRecommendations.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold">Movies You Might Love</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movieRecommendations.map((movie) => {
              const mediaType = getMediaType(movie)
              return (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  mediaType={mediaType}
                  actions={
                    <div className="flex gap-1">
                      <RateMovieDialog
                        movie={movie}
                        mediaType={mediaType}
                        trigger={
                          <Button size="sm" className="h-7 flex-1 gap-1 text-xs">
                            <Star className="h-3 w-3" />
                            Rate
                          </Button>
                        }
                      />
                      <WatchlistButton
                        tmdbId={movie.id}
                        mediaType={mediaType}
                        initialInWatchlist={false}
                      />
                    </div>
                  }
                />
              )
            })}
          </div>
        </section>
      )}

      {tvRecommendations.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Shows You Might Love</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {tvRecommendations.map((movie) => {
              const mediaType = getMediaType({ ...movie, media_type: "tv" })
              return (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  mediaType={mediaType}
                  actions={
                    <div className="flex gap-1">
                      <RateMovieDialog
                        movie={movie}
                        mediaType={mediaType}
                        trigger={
                          <Button size="sm" className="h-7 flex-1 gap-1 text-xs">
                            <Star className="h-3 w-3" />
                            Rate
                          </Button>
                        }
                      />
                      <WatchlistButton
                        tmdbId={movie.id}
                        mediaType={mediaType}
                        initialInWatchlist={false}
                      />
                    </div>
                  }
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
