"use client"

import { CheckCircle2 } from "lucide-react"

interface SeasonTabProps {
  seasonNumber: number
  watchedInSeason: number
  totalInSeason: number
  isActive: boolean
  tabId: string
  panelId: string
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export default function SeasonTab({
  seasonNumber,
  watchedInSeason,
  totalInSeason,
  isActive,
  tabId,
  panelId,
  onClick,
  onKeyDown,
}: SeasonTabProps) {
  const isComplete = watchedInSeason === totalInSeason && totalInSeason > 0
  const isSpecials = seasonNumber === 0

  return (
    <button
      id={tabId}
      role="tab"
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`flex shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
        isActive
          ? "border-blue-600/50 bg-blue-600/15 text-blue-400"
          : "border-white/[0.08] bg-white/[0.04] text-white/50 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white/70 active:scale-[0.97]"
      }`}
    >
      <span className="font-semibold">
        {isSpecials ? "Specials" : `S${seasonNumber}`}
      </span>
      {!isSpecials && (
        <>
          <span className={isActive ? "text-blue-400/50" : "text-white/20"}>·</span>
          <span className={`tabular-nums ${isActive ? "text-blue-300/80" : "text-white/35"}`}>
            {watchedInSeason}/{totalInSeason}
          </span>
          {isComplete && (
            <CheckCircle2
              className={`h-3 w-3 ${isActive ? "text-green-400" : "text-green-500/60"}`}
            />
          )}
        </>
      )}
    </button>
  )
}
