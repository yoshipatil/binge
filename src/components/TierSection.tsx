import { Badge } from "@/components/ui/badge"
import MovieCard from "@/components/MovieCard"
import RateMovieDialog from "@/components/RateMovieDialog"
import { Button } from "@/components/ui/button"
import { getTier } from "@/lib/tiers"
import type { RatedItem } from "@/types"

interface TierSectionProps {
  tierLabel: string
  items: RatedItem[]
}

export default function TierSection({ tierLabel, items }: TierSectionProps) {
  if (items.length === 0) return null

  const tier = getTier(items[0]?.rating.displayScore ?? 5)

  return (
    <div className="flex flex-col gap-3">
      {/* Tier label */}
      <div className="flex items-center gap-3">
        <Badge className={`px-4 py-1.5 text-sm font-bold ${tier.color} ${tier.text} border-0`}>
          {tierLabel}
        </Badge>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "title" : "titles"}</span>
      </div>

      {/* Movie grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {items.map(({ rating, movie }) => (
          <MovieCard
            key={rating.id}
            movie={movie}
            mediaType={rating.mediaType as "movie" | "tv" | "documentary"}
            displayScore={rating.displayScore}
            actions={
              <RateMovieDialog
                movie={movie}
                mediaType={rating.mediaType as "movie" | "tv" | "documentary"}
                existingScore={rating.seedScore}
                trigger={
                  <Button variant="ghost" size="sm" className="h-7 w-full text-xs">
                    Edit rating
                  </Button>
                }
              />
            }
          />
        ))}
      </div>
    </div>
  )
}
