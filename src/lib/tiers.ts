// Tier definitions — single source of truth for ranking labels and colors
// Glass-badge palette: transparent bg + colored border + colored text
// Reads as color-coded on any dark surface without being garish
// dotColor = solid fill used for the circular score badge on MovieCard posters

export type Tier = {
  label: string
  min: number   // inclusive
  max: number   // exclusive (except the last tier)
  color: string // badge background + border (glass style)
  text: string  // badge text color
  border: string
  dotColor: string // solid color for circular score badge
}

export const TIERS: Tier[] = [
  {
    label: "All Time",
    min: 9.0,
    max: 10.1,
    color: "bg-amber-500/15 border border-amber-500/40",
    text: "text-amber-400",
    border: "border-amber-500/40",
    dotColor: "bg-amber-500 text-black",
  },
  {
    label: "Loved It",
    min: 8.0,
    max: 9.0,
    color: "bg-blue-500/15 border border-blue-500/40",
    text: "text-blue-400",
    border: "border-blue-500/40",
    dotColor: "bg-blue-600 text-white",
  },
  {
    label: "Really Liked It",
    min: 7.0,
    max: 8.0,
    color: "bg-indigo-500/15 border border-indigo-500/30",
    text: "text-indigo-400",
    border: "border-indigo-500/30",
    dotColor: "bg-indigo-600 text-white",
  },
  {
    label: "Liked It",
    min: 6.0,
    max: 7.0,
    color: "bg-emerald-500/15 border border-emerald-500/30",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    dotColor: "bg-emerald-600 text-white",
  },
  {
    label: "It Was Fine",
    min: 5.0,
    max: 6.0,
    color: "bg-zinc-700/30 border border-zinc-600/40",
    text: "text-zinc-400",
    border: "border-zinc-600/40",
    dotColor: "bg-zinc-600 text-white",
  },
  {
    label: "Didn't Like It",
    min: 0.0,
    max: 5.0,
    color: "bg-rose-500/10 border border-rose-500/25",
    text: "text-rose-400/80",
    border: "border-rose-500/25",
    dotColor: "bg-rose-700 text-white",
  },
]

export const UNRATED = {
  label: "Unrated",
  color: "bg-zinc-800/50 border border-zinc-700/40",
  text: "text-zinc-500",
  border: "border-zinc-700/40",
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
