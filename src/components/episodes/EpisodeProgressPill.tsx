"use client"

import { PlayCircle } from "lucide-react"

interface EpisodeProgressPillProps {
  totalWatched: number
  totalEpisodes: number
}

export default function EpisodeProgressPill({
  totalWatched,
  totalEpisodes,
}: EpisodeProgressPillProps) {
  if (totalEpisodes === 0) return null

  const pct = Math.round((totalWatched / totalEpisodes) * 100)

  return (
    <div className="mt-1.5 flex items-center gap-1.5 px-0">
      <PlayCircle className="h-3 w-3 shrink-0 text-blue-500" />
      <span className="shrink-0 text-[10px] tabular-nums text-white/40">
        {totalWatched} / {totalEpisodes} eps
      </span>
      <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-[10px] tabular-nums text-white/30">
        {pct}%
      </span>
    </div>
  )
}
