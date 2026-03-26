import { Suspense } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMultipleMovies } from "@/lib/tmdb"
import MovieCard from "@/components/MovieCard"
import RateMovieDialog from "@/components/RateMovieDialog"
import MediaTypeTabs from "@/components/MediaTypeTabs"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { MediaType } from "@/types"
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
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
          <BookmarkX className="h-7 w-7 text-white/30" />
        </div>
        <p className="text-lg font-semibold">Your watchlist is empty</p>
        <p className="text-sm text-muted-foreground">
          Add movies from Search or from any movie page.
        </p>
      </div>
    )
  }

  const movies = await getMultipleMovies(
    filtered.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType }))
  )

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {filtered.map((item, i) => (
        <MovieCard
          key={item.id}
          movie={movies[i]}
          mediaType={item.mediaType as MediaType}
          actions={
            <RateMovieDialog
              movie={movies[i]}
              mediaType={item.mediaType as MediaType}
              trigger={
                <Button size="sm" className="h-7 w-full gap-1 text-xs">
                  <Star className="h-3 w-3" />
                  Rate it
                </Button>
              }
            />
          }
        />
      ))}
    </div>
  )
}

export default async function WatchlistPage({ searchParams }: WatchlistPageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  const { type } = await searchParams

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Watchlist</h1>
          <p className="text-sm text-muted-foreground">Movies and shows you want to see</p>
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
