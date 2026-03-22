// Tier definitions — the single source of truth for all ranking labels and colors
// Colors go green → purple → blue → orange → yellow → red (highest to lowest)

export type Tier = {
  label: string
  min: number // inclusive
  max: number // exclusive (except the last tier)
  color: string // badge background
  text: string // badge text
  border: string // border accent
}

export const TIERS: Tier[] = [
  {
    label: "All Time",
    min: 9.0,
    max: 10.1,
    color: "bg-blue-500",
    text: "text-white",
    border: "border-blue-500",
  },
  {
    label: "Loved It",
    min: 8.0,
    max: 9.0,
    color: "bg-purple-500",
    text: "text-white",
    border: "border-purple-500",
  },
  {
    label: "Really Liked It",
    min: 7.0,
    max: 8.0,
    color: "bg-blue-500",
    text: "text-white",
    border: "border-blue-500",
  },
  {
    label: "Liked It",
    min: 6.0,
    max: 7.0,
    color: "bg-orange-400",
    text: "text-white",
    border: "border-orange-400",
  },
  {
    label: "It Was Fine",
    min: 5.0,
    max: 6.0,
    color: "bg-yellow-400",
    text: "text-black",
    border: "border-yellow-400",
  },
  {
    label: "Didn't Like It",
    min: 0.0,
    max: 5.0,
    color: "bg-red-400",
    text: "text-white",
    border: "border-red-400",
  },
]

export const UNRATED = {
  label: "Unrated",
  color: "bg-gray-300",
  text: "text-gray-700",
  border: "border-gray-300",
}

export function getTier(score: number): Tier {
  return TIERS.find((t) => score >= t.min && score < t.max) ?? TIERS[TIERS.length - 1]
}

export function groupByTier<T extends { displayScore: number }>(
  items: T[]
): Map<string, T[]> {
  const map = new Map<string, T[]>(TIERS.map((t) => [t.label, []]))
  items.forEach((item) => {
    const tier = getTier(item.displayScore)
    map.get(tier.label)!.push(item)
  })
  return map
}
