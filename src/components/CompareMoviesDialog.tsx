"use client"

// The core Binge experience — head-to-head comparisons that refine your ELO rankings
// Shows two movie posters side by side: "Which did you prefer?"
// Each tap updates both movies' ELO scores dynamically

import { useState, useEffect } from "react"
import Image from "next/image"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getPosterUrl, getMovieDetails, getTVDetails } from "@/lib/tmdb"
import { getTitle, type TMDBMovie, type MediaType } from "@/types"

interface CompareMoviesDialogProps {
  newMovie: TMDBMovie
  newMovieMediaType: MediaType
  candidateIds: number[]
  onFinish: () => void
}

export default function CompareMoviesDialog({
  newMovie,
  newMovieMediaType,
  candidateIds,
  onFinish,
}: CompareMoviesDialogProps) {
  const [open, setOpen] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [candidates, setCandidates] = useState<TMDBMovie[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Fetch TMDB details for all comparison candidates
  useEffect(() => {
    async function fetchCandidates() {
      try {
        const movies = await Promise.all(
          candidateIds.map((id) =>
            newMovieMediaType === "tv" ? getTVDetails(id) : getMovieDetails(id)
          )
        )
        setCandidates(movies)
      } catch (err) {
        console.error("Failed to fetch comparison candidates:", err)
        onFinish()
      } finally {
        setLoading(false)
      }
    }
    if (candidateIds.length > 0) fetchCandidates()
    else onFinish()
  }, [candidateIds, newMovieMediaType, onFinish])

  async function handleChoice(winnerId: number, loserId: number) {
    setSubmitting(true)
    try {
      await fetch("/api/ratings/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId,
          loserId,
          mediaType: newMovieMediaType,
        }),
      })

      if (currentIndex + 1 >= candidates.length) {
        setOpen(false)
        onFinish()
      } else {
        setCurrentIndex((i) => i + 1)
      }
    } catch (err) {
      console.error("Comparison failed:", err)
    } finally {
      setSubmitting(false)
    }
  }

  function handleSkipAll() {
    setOpen(false)
    onFinish()
  }

  const opponent = candidates[currentIndex]
  const total = candidates.length
  const progress = total > 0 ? ((currentIndex) / total) * 100 : 0

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false); onFinish() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Which did you prefer?</DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        {total > 0 && (
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {currentIndex + 1} of {total}
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground text-sm">Loading comparisons...</p>
          </div>
        ) : opponent ? (
          <div className="flex gap-3">
            {/* New movie */}
            <button
              className="flex-1 flex flex-col gap-2 rounded-lg border-2 border-transparent p-2 transition-all hover:border-green-500 hover:shadow-md active:scale-95 disabled:opacity-50"
              onClick={() => handleChoice(newMovie.id, opponent.id)}
              disabled={submitting}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={getPosterUrl(newMovie.poster_path)}
                  alt={getTitle(newMovie)}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-center text-xs font-medium line-clamp-2">{getTitle(newMovie)}</p>
              <div className="text-center">
                <span className="rounded-full bg-green-500 px-3 py-0.5 text-xs font-semibold text-white">
                  This one
                </span>
              </div>
            </button>

            <div className="flex items-center justify-center">
              <span className="text-sm font-bold text-muted-foreground">VS</span>
            </div>

            {/* Opponent */}
            <button
              className="flex-1 flex flex-col gap-2 rounded-lg border-2 border-transparent p-2 transition-all hover:border-green-500 hover:shadow-md active:scale-95 disabled:opacity-50"
              onClick={() => handleChoice(opponent.id, newMovie.id)}
              disabled={submitting}
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                <Image
                  src={getPosterUrl(opponent.poster_path)}
                  alt={getTitle(opponent)}
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-center text-xs font-medium line-clamp-2">{getTitle(opponent)}</p>
              <div className="text-center">
                <span className="rounded-full bg-green-500 px-3 py-0.5 text-xs font-semibold text-white">
                  This one
                </span>
              </div>
            </button>
          </div>
        ) : null}

        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={handleSkipAll}>
          Skip comparisons
        </Button>
      </DialogContent>
    </Dialog>
  )
}
