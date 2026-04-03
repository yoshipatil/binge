import { Suspense } from "react"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMultipleMovies } from "@/lib/tmdb"
import MovieCard from "@/components/MovieCard"
import MovieCardSheet from "@/components/MovieCardSheet"
import RateMovieDialog from "@/components/RateMovieDialog"
import TVCardEpisodeWrapper from "@/components/episodes/TVCardEpisodeWrapper"
import MediaTypeTabs from "@/components/MediaTypeTabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getEpisodeStatsBatch } from "@/lib/episodeStats"
import type { MediaType, TMDBMovie } from "@/types"
import { Star, BookmarkX } from "lucide-react"

interface WatchlistPageProps {
  searchParams: Promise<{ type?: string }>
}

async function WatchlistGrid({ mediaType, userId }: { mediaType: string | undefined; userId: string }) {
  const allItems = await prisma.watchlist.findMany({
    where: { userId },
    orderBy: { addedAt: "desc" },
  })

  const filtered = mediaType && mediaType !== "all"
    ? allItems.filter((i) => i.mediaType === mediaType)
    : allItems

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
        <BookmarkX className="h-10 w-10 text-white/10" />
        <div>
          <p className="text-lg font-bold text-white">Nothing saved yet.</p>
          <p className="mt-1.5 text-sm text-white/35">
            Add titles from search or any film page.
          </p>
        </div>
        <Link href="/search" className="rounded-xl bg-blue-600 px-5 py-3 min-h-[44px] text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
          Browse titles
        </Link>
      </div>
    )
  }

  const movies = await getMultipleMovies(
    filtered.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType }))
  )

  // Fetch episode stats for all TV items in one Prisma query (no HTTP round-trip)
  const tvShowIds = filtered
    .filter((item, i) =>
      item.mediaType === "tv" &&
      movies[i] != null &&
      (movies[i]!.seasons?.filter(s => s.season_number > 0).length ?? 0) > 0
    )
    .map(item => item.tmdbId)

  const episodeStatsMap = await getEpisodeStatsBatch(userId, tvShowIds)

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {filtered.map((item, i) => {
        const movie = movies[i] as TMDBMovie
        const isTVWithSeasons =
          item.mediaType === "tv" &&
          movie != null &&
          (movie.seasons?.filter(s => s.season_number > 0).length ?? 0) > 0

        const rateAction = (
          <RateMovieDialog
            movie={movie}
            mediaType={item.mediaType as MediaType}
            trigger={
              <Button size="sm" className="h-9 w-full gap-1 text-xs bg-blue-600 hover:bg-blue-500 text-white border-0">
                <Star className="h-3 w-3" />
                Rate it
              </Button>
            }
          />
        )

        const episodeStats = episodeStatsMap.get(item.tmdbId)
        if (isTVWithSeasons && episodeStats) {
          const totalEpisodes = movie.seasons
            ?.filter(s => s.season_number > 0)
            .reduce((a, s) => a + s.episode_count, 0) ?? 0
          return (
            <MovieCardSheet key={item.id} movie={movie} mediaType={item.mediaType as MediaType} initialInWatchlist>
              <TVCardEpisodeWrapper
                movie={movie}
                mediaType={item.mediaType as MediaType}
                actions={rateAction}
                initialEpisodeStats={{ ...episodeStats, totalEpisodes }}
              />
            </MovieCardSheet>
          )
        }

        return (
          <MovieCardSheet key={item.id} movie={movie} mediaType={item.mediaType as MediaType} initialInWatchlist>
            <MovieCard
              movie={movie}
              mediaType={item.mediaType as MediaType}
              actions={rateAction}
            />
          </MovieCardSheet>
        )
      })}
    </div>
  )
}

export default async function WatchlistPage({ searchParams }: WatchlistPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const { type } = await searchParams

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-6">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Up Next</h1>
          <p className="text-sm text-muted-foreground">On your radar.</p>
        </div>
        <Suspense fallback={null}>
          <MediaTypeTabs />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        }
      >
        <WatchlistGrid mediaType={type} userId={session.user.id} />
      </Suspense>
    </div>
  )
}
