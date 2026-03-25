import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { getMovieRecommendations, getTVRecommendations, getWatchProvidersForMany } from "@/lib/tmdb"
import MovieCard from "@/components/MovieCard"
import RateMovieDialog from "@/components/RateMovieDialog"
import WatchlistButton from "@/components/WatchlistButton"
import StreamingFilter from "@/components/StreamingFilter"
import { Button } from "@/components/ui/button"
import { getMediaType, type TMDBMovie } from "@/types"
import { Star, Sparkles, Tv } from "lucide-react"

interface RecsPageProps {
  searchParams: Promise<{ streaming?: string }>
}

export default async function RecommendationsPage({ searchParams }: RecsPageProps) {
  const { streaming } = await searchParams

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

  const [allRatings, allWatchlist] = await Promise.all([
    prisma.rating.findMany({ select: { tmdbId: true } }),
    prisma.watchlist.findMany({ select: { tmdbId: true } }),
  ])

  const watchlistIds = new Set(allWatchlist.map((w) => w.tmdbId))
  const alreadySeen = new Set([
    ...allRatings.map((r) => r.tmdbId),
    ...watchlistIds,
  ])

  const [movieRecs, tvRecs] = await Promise.all([
    Promise.all(topMovies.map((r) => getMovieRecommendations(r.tmdbId).catch(() => ({ results: [] })))),
    Promise.all(topTV.map((r) => getTVRecommendations(r.tmdbId).catch(() => ({ results: [] })))),
  ])

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

  let movieRecommendations = processRecs(movieRecs)
  let tvRecommendations = processRecs(tvRecs)

  // Filter by streaming service if selected
  if (streaming) {
    const providerIds = streaming.split(",").map(Number).filter(Boolean)
    const allRecs = [...movieRecommendations, ...tvRecommendations]
    const providers = await getWatchProvidersForMany(
      allRecs.map((m) => ({ tmdbId: m.id, mediaType: m.media_type === "tv" ? "tv" : "movie" }))
    )
    movieRecommendations = movieRecommendations.filter((m) =>
      providers.get(m.id)?.flatrate?.some((p) => providerIds.includes(p.provider_id))
    )
    tvRecommendations = tvRecommendations.filter((m) =>
      providers.get(m.id)?.flatrate?.some((p) => providerIds.includes(p.provider_id))
    )
  }

  const hasEnoughRatings = topMovies.length > 0 || topTV.length > 0
  const hasAnything = movieRecommendations.length > 0 || tvRecommendations.length > 0

  if (!hasEnoughRatings) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <PageHeader />
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Sparkles className="h-7 w-7 text-white/30" />
          </div>
          <p className="text-lg font-semibold">Rate more to unlock recommendations</p>
          <p className="text-sm text-muted-foreground">
            Rate at least a few titles and Binge will find what to watch next.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <PageHeader />
        <Suspense fallback={null}>
          <StreamingFilter />
        </Suspense>
      </div>

      {!hasAnything && (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Tv className="h-7 w-7 text-white/30" />
          </div>
          <p className="text-lg font-semibold">Nothing here for this service</p>
          <p className="text-sm text-muted-foreground">
            Try a different streaming filter or clear it.
          </p>
        </div>
      )}

      {movieRecommendations.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-base font-bold tracking-tight text-white/90">Movies You Might Love</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                          <Button size="sm" className="h-7 flex-1 gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">
                            <Star className="h-3 w-3" />
                            Rate
                          </Button>
                        }
                      />
                      <WatchlistButton tmdbId={movie.id} mediaType={mediaType} initialInWatchlist={watchlistIds.has(movie.id)} />
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
          <h2 className="mb-4 text-base font-bold tracking-tight text-white/90">Shows You Might Love</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
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
                          <Button size="sm" className="h-7 flex-1 gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">
                            <Star className="h-3 w-3" />
                            Rate
                          </Button>
                        }
                      />
                      <WatchlistButton tmdbId={movie.id} mediaType={mediaType} initialInWatchlist={watchlistIds.has(movie.id)} />
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

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-black tracking-tight">For You</h1>
      <p className="mt-0.5 text-sm text-muted-foreground">
        Picked from your highest-ranked titles
      </p>
    </div>
  )
}
