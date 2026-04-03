"use client"

import { useReducedMotion, AnimatePresence, motion } from "framer-motion"
import EpisodeRow from "./EpisodeRow"
import EpisodeRowSkeleton from "./EpisodeRowSkeleton"
import EpisodeListEmpty from "./EpisodeListEmpty"
import type { TMDBEpisode } from "@/types"

interface EpisodeListProps {
  activeSeason: number
  episodes: TMDBEpisode[] | undefined
  isLoading: boolean
  watchedSet: Set<string>
  showTmdbId: number
  onToggle: (episode: TMDBEpisode) => void
}

export default function EpisodeList({
  activeSeason,
  episodes,
  isLoading,
  watchedSet,
  showTmdbId,
  onToggle,
}: EpisodeListProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      role="tabpanel"
      id={`season-content-${showTmdbId}-${activeSeason}`}
      aria-live="polite"
      className="max-h-[480px] overflow-y-auto [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin]"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`season-${activeSeason}`}
          initial={shouldReduceMotion ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? {} : { opacity: 0, y: -4 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.18, ease: "easeOut" }}
        >
          {isLoading ? (
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {Array.from({ length: 4 }).map((_, i) => (
                <EpisodeRowSkeleton key={i} />
              ))}
            </div>
          ) : !episodes || episodes.length === 0 ? (
            <EpisodeListEmpty />
          ) : (
            <div className="flex flex-col divide-y divide-white/[0.04]">
              {episodes.map((ep) => (
                <EpisodeRow
                  key={`${ep.season_number}-${ep.episode_number}`}
                  episode={ep}
                  watched={watchedSet.has(`${ep.season_number}:${ep.episode_number}`)}
                  onToggle={onToggle}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
