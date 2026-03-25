import TierSection from "@/components/TierSection"
import { TIERS, groupByTier } from "@/lib/tiers"
import { Film } from "lucide-react"
import type { RatedItem } from "@/types"

interface TierListProps {
  items: RatedItem[]
}

export default function TierList({ items }: TierListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
          <Film className="h-7 w-7 text-white/30" />
        </div>
        <p className="text-lg font-semibold">Nothing here yet</p>
        <p className="text-sm text-muted-foreground">
          Search for a movie and rate it to start building your list.
        </p>
      </div>
    )
  }

  const grouped = groupByTier(items.map((i) => ({ ...i, displayScore: i.rating.displayScore })))

  return (
    <div className="flex flex-col gap-8">
      {TIERS.map((tier) => {
        const tierItems = (grouped.get(tier.label) ?? []) as unknown as RatedItem[]
        return (
          <TierSection key={tier.label} tierLabel={tier.label} items={tierItems} />
        )
      })}
    </div>
  )
}
