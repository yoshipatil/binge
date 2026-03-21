import TierSection from "@/components/TierSection"
import { TIERS, groupByTier } from "@/lib/tiers"
import type { RatedItem } from "@/types"

interface TierListProps {
  items: RatedItem[]
}

export default function TierList({ items }: TierListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <p className="text-4xl">🎬</p>
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
