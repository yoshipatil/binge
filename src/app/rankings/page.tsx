import { Suspense } from "react"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getMultipleMovies } from "@/lib/tmdb"
import TierList from "@/components/TierList"
import MediaTypeTabs from "@/components/MediaTypeTabs"
import { Skeleton } from "@/components/ui/skeleton"
import { buttonVariants } from "@/components/ui/button"
import type { RatedItem, MediaType } from "@/types"

const PAGE_SIZE = 50

interface RankingsPageProps {
  searchParams: Promise<{ type?: string; page?: string }>
}

async function RankingsList({ mediaType, page }: { mediaType: string | undefined; page: number }) {
  const allRatings = await prisma.rating.findMany({
    orderBy: { eloScore: "desc" },
  })

  const filtered = mediaType && mediaType !== "all"
    ? allRatings.filter((r) => r.mediaType === mediaType)
    : allRatings

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-4xl">🎬</p>
        <p className="text-lg font-semibold">Nothing rated yet</p>
        <p className="text-sm text-muted-foreground">
          Go to Search and rate something to see it here.
        </p>
      </div>
    )
  }

  // Normalize ELO within each media type group (must normalize across ALL ratings, not just this page)
  const grouped: Record<string, typeof allRatings> = {}
  filtered.forEach((r) => {
    if (!grouped[r.mediaType]) grouped[r.mediaType] = []
    grouped[r.mediaType].push(r)
  })

  const withDisplayScores = Object.values(grouped)
    .flatMap((group) => normalizeEloScores(group))
    .sort((a, b) => b.eloScore - a.eloScore)

  const totalCount = withDisplayScores.length
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const currentPage = Math.min(Math.max(page, 1), totalPages || 1)
  const pageSlice = withDisplayScores.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Fetch TMDB details only for this page
  const movies = await getMultipleMovies(
    pageSlice.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType }))
  )

  const items: RatedItem[] = pageSlice
    .map((rating, i) => ({
      rating: {
        ...rating,
        mediaType: rating.mediaType as MediaType,
        watchedAt: rating.watchedAt.toISOString(),
        displayScore: isNaN(rating.displayScore) ? 5 : (rating.displayScore ?? 5),
      },
      movie: movies[i],
    }))
    .filter((item) => item.movie != null)

  items.sort((a, b) => b.rating.displayScore - a.rating.displayScore)

  const typeParam = mediaType && mediaType !== "all" ? `&type=${mediaType}` : ""

  return (
    <div className="flex flex-col gap-6">
      <TierList items={items} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/rankings?page=${currentPage - 1}${typeParam}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Previous
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`/rankings?page=${currentPage + 1}${typeParam}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const { type, page: pageParam } = await searchParams
  const page = parseInt(pageParam ?? "1", 10)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold">Your Rankings</h1>
          <p className="text-sm text-muted-foreground">
            Ranked by your ELO score — updated dynamically as you compare
          </p>
        </div>
        <Suspense fallback={null}>
          <MediaTypeTabs />
        </Suspense>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="aspect-[2/3] w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        }
      >
        <RankingsList mediaType={type} page={page} />
      </Suspense>
    </div>
  )
}
