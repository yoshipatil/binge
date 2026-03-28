import { Suspense } from "react"
import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getMultipleMovies } from "@/lib/tmdb"
import MovieCard from "@/components/MovieCard"
import MovieCardSheet from "@/components/MovieCardSheet"
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

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {filtered.map((item, i) => (
        <MovieCardSheet key={item.id} movie={movies[i]} mediaType={item.mediaType as MediaType} initialInWatchlist>
          <MovieCard
            movie={movies[i]}
            mediaType={item.mediaType as MediaType}
            actions={
              <RateMovieDialog
                movie={movies[i]}
                mediaType={item.mediaType as MediaType}
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
      ))}
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
