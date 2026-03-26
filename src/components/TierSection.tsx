import MovieCard from "@/components/MovieCard"
import RateMovieDialog from "@/components/RateMovieDialog"
import { Button } from "@/components/ui/button"
import { getTier, TIERS } from "@/lib/tiers"
import { Trophy, Heart, Star, ThumbsUp, Minus, ThumbsDown } from "lucide-react"
import type { RatedItem } from "@/types"

const TIER_ICONS: Record<string, React.ElementType> = {
  "All-Time": Trophy,
  "Loved It": Heart,
  "Really Good": Star,
  "Good": ThumbsUp,
  "Mid": Minus,
  "Didn't Like It": ThumbsDown,
}

interface TierSectionProps {
  tierLabel: string
  items: RatedItem[]
}

export default function TierSection({ tierLabel, items }: TierSectionProps) {
  if (items.length === 0) return null

  const tier = getTier(items[0]?.rating.displayScore ?? 5)
  const TierIcon = TIER_ICONS[tierLabel] ?? Star

  return (
    <div className="flex flex-col gap-4">
      {/* Tier header */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${tier.color}`}>
          <TierIcon className={`h-3.5 w-3.5 ${tier.text}`} />
          <span className={`text-sm font-bold tracking-wide ${tier.text}`}>
            {tierLabel}
          </span>
        </div>
        <div className="h-px flex-1 bg-white/5" />
        <span className="text-xs text-white/30 tabular-nums">
          {items.length} {items.length === 1 ? "title" : "titles"}
        </span>
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
                trigger={
                  <Button variant="ghost" size="sm" className="h-8 w-full text-xs text-white/40 hover:text-white hover:bg-white/5">
                    Re-rank
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
