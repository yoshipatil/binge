import { Suspense } from "react"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMovieRecommendations, getTVRecommendations, getWatchProvidersForMany, getMultipleMovies } from "@/lib/tmdb"
import MovieCard from "@/components/MovieCard"
import MovieCardSheet from "@/components/MovieCardSheet"
import RateMovieDialog from "@/components/RateMovieDialog"
import WatchlistButton from "@/components/WatchlistButton"
import StreamingFilter from "@/components/StreamingFilter"
import ForYouTabSwitcher from "@/components/ForYouTabSwitcher"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getMediaType, type TMDBMovie, type MediaType } from "@/types"
import { Star, Sparkles, Tv, BookmarkX } from "lucide-react"

interface RecsPageProps {
  searchParams: Promise<{ streaming?: string; tab?: string }>
}

export default async function RecommendationsPage({ searchParams }: RecsPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")
  const userId = session.user.id

  const { streaming, tab } = await searchParams
  const activeTab = tab === "watchlist" ? "watchlist" : "foryou"

  // ── Watchlist tab ──────────────────────────────────────────────────────────
  if (activeTab === "watchlist") {
    const watchlistItems = await prisma.watchlist.findMany({
      where: { userId },
      orderBy: { addedAt: "desc" },
    })

    const movies = watchlistItems.length > 0
      ? await getMultipleMovies(watchlistItems.map(i => ({ tmdbId: i.tmdbId, mediaType: i.mediaType })))
      : []

    return (
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
        <div className="mb-6 flex flex-col gap-4">
          <PageHeader />
          <Suspense fallback={null}>
            <ForYouTabSwitcher />
          </Suspense>
        </div>

        {watchlistItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
            <BookmarkX className="h-10 w-10 text-white/10" />
            <div>
              <p className="text-lg font-bold text-white">Nothing saved yet.</p>
              <p className="mt-1.5 text-sm text-white/35">Add titles from search or any film page.</p>
            </div>
            <Link href="/search" className="rounded-xl bg-blue-600 px-5 py-3 min-h-[44px] text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
              Browse titles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {watchlistItems.map((item, i) => {
              const movie = movies[i] as TMDBMovie
              if (!movie) return null
              const mediaType = item.mediaType as MediaType
              return (
                <MovieCardSheet key={item.id} movie={movie} mediaType={mediaType} initialInWatchlist>
                  <MovieCard
                    movie={movie}
                    mediaType={mediaType}
                    actions={
                      <RateMovieDialog
                        movie={movie}
                        mediaType={mediaType}
                        trigger={
                          <Button size="sm" className="h-9 w-full gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">
                            <Star className="h-3 w-3" />
                            Rate it
                          </Button>
                        }
                      />
                    }
                  />
                </MovieCardSheet>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const [topMovies, topTV] = await Promise.all([
    prisma.rating.findMany({
      where: { userId, mediaType: { in: ["movie", "documentary"] } },
      orderBy: { eloScore: "desc" },
      take: 20,
    }),
    prisma.rating.findMany({
      where: { userId, mediaType: "tv" },
      orderBy: { eloScore: "desc" },
      take: 20,
    }),
  ])

  const [allRatings, allWatchlist] = await Promise.all([
    prisma.rating.findMany({ where: { userId }, select: { tmdbId: true } }),
    prisma.watchlist.findMany({ where: { userId }, select: { tmdbId: true } }),
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
    return results.sort((a, b) => b.vote_average - a.vote_average).slice(0, 40)
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
      <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
        <div className="mb-6 flex flex-col gap-4">
          <PageHeader />
          <Suspense fallback={null}><ForYouTabSwitcher /></Suspense>
        </div>
        <div className="flex flex-col items-center gap-5 py-24 text-center">
          <Sparkles className="h-10 w-10 text-white/10" />
          <div>
            <p className="text-lg font-bold text-white">Rate a few films first.</p>
            <p className="mt-1.5 text-sm text-white/35">Binge needs something to work with.</p>
          </div>
          <Link href="/search" className="rounded-xl bg-blue-600 px-5 py-3 min-h-[44px] text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
            Start rating
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
      <div className="mb-6 flex flex-col gap-4">
        <PageHeader />
        <Suspense fallback={null}><ForYouTabSwitcher /></Suspense>
        <Suspense fallback={null}><StreamingFilter /></Suspense>
      </div>

      {!hasAnything && (
        <div className="flex flex-col items-center gap-5 py-24 text-center">
          <Tv className="h-10 w-10 text-white/10" />
          <div>
            <p className="text-lg font-bold text-white">Nothing on this service yet.</p>
            <p className="mt-1.5 text-sm text-white/35">Try a different filter or rate more titles.</p>
          </div>
          <Link href="/search" className="flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm text-white/60 hover:text-white hover:border-white/20 transition-colors">
            Rate more titles
          </Link>
        </div>
      )}

      {movieRecommendations.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-base font-bold tracking-tight text-white/90">Movies You Might Love</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movieRecommendations.map((movie) => {
              const mediaType = getMediaType(movie)
              return (
                <MovieCardSheet key={movie.id} movie={movie} mediaType={mediaType} initialInWatchlist={watchlistIds.has(movie.id)}>
                  <MovieCard
                    movie={movie}
                    mediaType={mediaType}
                    actions={
                      <div className="flex gap-1">
                        <RateMovieDialog
                          movie={movie}
                          mediaType={mediaType}
                          trigger={
                            <Button size="sm" className="h-9 flex-1 gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">
                              <Star className="h-3 w-3" />
                              Rate
                            </Button>
                          }
                        />
                        <WatchlistButton tmdbId={movie.id} mediaType={mediaType} initialInWatchlist={watchlistIds.has(movie.id)} />
                      </div>
                    }
                  />
                </MovieCardSheet>
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
                <MovieCardSheet key={movie.id} movie={movie} mediaType={mediaType} initialInWatchlist={watchlistIds.has(movie.id)}>
                  <MovieCard
                    movie={movie}
                    mediaType={mediaType}
                    actions={
                      <div className="flex gap-1">
                        <RateMovieDialog
                          movie={movie}
                          mediaType={mediaType}
                          trigger={
                            <Button size="sm" className="h-9 flex-1 gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">
                              <Star className="h-3 w-3" />
                              Rate
                            </Button>
                          }
                        />
                        <WatchlistButton tmdbId={movie.id} mediaType={mediaType} initialInWatchlist={watchlistIds.has(movie.id)} />
                      </div>
                    }
                  />
                </MovieCardSheet>
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
      <p className="mt-0.5 text-sm text-white/40">Based on what you love.</p>
    </div>
  )
}
