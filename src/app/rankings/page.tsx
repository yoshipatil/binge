import { Suspense } from "react"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getMultipleMovies } from "@/lib/tmdb"
import TierList from "@/components/TierList"
import MediaTypeTabs from "@/components/MediaTypeTabs"
import { Skeleton } from "@/components/ui/skeleton"
import type { RatedItem, MediaType } from "@/types"

interface RankingsPageProps {
  searchParams: Promise<{ type?: string }>
}

async function RankingsList({ mediaType }: { mediaType: string | undefined }) {
  // Fetch all ratings from DB
  const allRatings = await prisma.rating.findMany({
    orderBy: { eloScore: "desc" },
  })

  // Filter by media type if specified
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

  // Normalize ELO within each media type group
  const grouped: Record<string, typeof allRatings> = {}
  filtered.forEach((r) => {
    if (!grouped[r.mediaType]) grouped[r.mediaType] = []
    grouped[r.mediaType].push(r)
  })

  const withDisplayScores = Object.values(grouped).flatMap((group) =>
    normalizeEloScores(group)
  )

  // Fetch TMDB details for all movies in parallel
  const movies = await getMultipleMovies(
    withDisplayScores.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType }))
  )

  const items: RatedItem[] = withDisplayScores.map((rating, i) => ({
    rating: {
      ...rating,
      mediaType: rating.mediaType as MediaType,
      watchedAt: rating.watchedAt.toISOString(),
      displayScore: (rating as typeof rating & { displayScore: number }).displayScore,
    },
    movie: movies[i],
  }))

  // Sort by display score descending
  items.sort((a, b) => b.rating.displayScore - a.rating.displayScore)

  return <TierList items={items} />
}

export default async function RankingsPage({ searchParams }: RankingsPageProps) {
  const { type } = await searchParams

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
        <RankingsList mediaType={type} />
      </Suspense>
    </div>
  )
}
