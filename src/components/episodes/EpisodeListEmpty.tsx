"use client"

import { Tv } from "lucide-react"

export default function EpisodeListEmpty() {
  return (
    <div className="flex flex-col items-center gap-2 py-8 text-center">
      <Tv className="h-8 w-8 text-white/10" />
      <p className="text-sm text-white/30">No episodes yet</p>
      <p className="text-[11px] text-white/20">Episodes will appear when available</p>
    </div>
  )
}
