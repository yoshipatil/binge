"use client"

import { useReducedMotion, AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { Circle, CheckCircle2, Clapperboard } from "lucide-react"
import type { TMDBEpisode } from "@/types"

interface EpisodeRowProps {
  episode: TMDBEpisode
  watched: boolean
  onToggle: (episode: TMDBEpisode) => void
}

export default function EpisodeRow({ episode, watched, onToggle }: EpisodeRowProps) {
  const shouldReduceMotion = useReducedMotion()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onToggle(episode)
    }
  }

  const airDateFormatted = episode.air_date
    ? new Date(episode.air_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null

  const hasRuntime = episode.runtime != null && episode.runtime > 0

  const ariaLabel = `Episode ${episode.episode_number}: ${episode.name}, ${airDateFormatted ? `${airDateFormatted}, ` : ""}${hasRuntime ? `${episode.runtime} minutes, ` : ""}${watched ? "watched" : "not watched"}`

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      onClick={() => onToggle(episode)}
      className={`group flex min-h-[64px] cursor-pointer items-start gap-3 border-l-2 py-2.5 pl-2 transition-colors duration-200 hover:bg-white/[0.02] active:bg-white/[0.04] ${
        watched ? "border-blue-600/40" : "border-transparent"
      }`}
    >
      {/* Still image */}
      <div className="relative h-[54px] w-[96px] shrink-0 overflow-hidden rounded-md bg-zinc-800">
        {episode.still_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
            alt={`Still from ${episode.name}`}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Clapperboard className="h-5 w-5 text-white/[0.12]" />
          </div>
        )}
        {/* Episode number badge */}
        <div className="absolute left-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white/70 backdrop-blur-sm">
          E{episode.episode_number}
        </div>
      </div>

      {/* Metadata column */}
      <div className="flex flex-1 flex-col gap-0.5 pt-0.5">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-white/85 transition-colors group-hover:text-white">
          {episode.name}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-white/35">
          {airDateFormatted && <span>{airDateFormatted}</span>}
          {airDateFormatted && hasRuntime && (
            <span className="text-white/20">·</span>
          )}
          {hasRuntime && <span>{episode.runtime}m</span>}
        </div>
      </div>

      {/* Watched toggle */}
      <div className="flex shrink-0 items-center self-center pl-1">
        <button
          aria-label={`Mark episode ${episode.episode_number} as ${watched ? "unwatched" : "watched"}`}
          aria-pressed={watched}
          aria-hidden="true"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation()
            onToggle(episode)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 active:scale-[0.88]"
        >
          <AnimatePresence mode="wait" initial={false}>
            {watched ? (
              <motion.div
                key="checked"
                initial={shouldReduceMotion ? {} : { scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={shouldReduceMotion ? {} : { scale: 0.5, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.15, ease: "easeOut" }}
              >
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              </motion.div>
            ) : (
              <motion.div
                key="unchecked"
                initial={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={shouldReduceMotion ? {} : { scale: 0.8, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0.01 : 0.12, ease: "easeIn" }}
              >
                <Circle className="h-5 w-5 text-white/20 transition-colors group-hover:text-white/35" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  )
}
