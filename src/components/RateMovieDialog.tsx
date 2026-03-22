"use client"

// The rating flow — no number picking, ever.
// Step 1: Pick a broad tier (how did you feel about it?)
// Step 2: Head-to-head comparisons to place it precisely
// Score is assigned by the algorithm, not by the user.

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getPosterUrl, getMovieDetails, getTVDetails } from "@/lib/tmdb"
import { TIERS } from "@/lib/tiers"
import { getTitle, type TMDBMovie, type MediaType } from "@/types"

// Map each tier to a starting seed score (midpoint of the tier range)
const TIER_SEED_SCORES: Record<string, number> = {
  "All Time":        9.5,
  "Loved It":        8.5,
  "Really Liked It": 7.5,
  "Liked It":        6.5,
  "It Was Fine":     5.5,
  "Didn't Like It":  3.0,
}

const TIER_EMOJIS: Record<string, string> = {
  "All Time":        "🏆",
  "Loved It":        "❤️",
  "Really Liked It": "😊",
  "Liked It":        "👍",
  "It Was Fine":     "😐",
  "Didn't Like It":  "👎",
}

interface RateMovieDialogProps {
  movie: TMDBMovie
  mediaType: MediaType
  existingScore?: number
  trigger: React.ReactNode
}

type Step = "tier" | "compare" | "done"

export default function RateMovieDialog({
  movie,
  mediaType,
  existingScore,
  trigger,
}: RateMovieDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("tier")
  const [candidateIds, setCandidateIds] = useState<number[]>([])
  const [candidates, setCandidates] = useState<TMDBMovie[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)

  function handleOpen() {
    setOpen(true)
    setStep("tier")
    setCandidateIds([])
    setCandidates([])
    setCurrentIndex(0)
  }

  async function handleTierPick(tierLabel: string) {
    setSaving(true)
    const seedScore = TIER_SEED_SCORES[tierLabel]

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: movie.id, mediaType, seedScore }),
      })
      const data = await res.json()

      if (data.candidateIds?.length > 0) {
        // Fetch TMDB details for comparison candidates
        const movies = await Promise.all(
          data.candidateIds.map((id: number) =>
            mediaType === "tv" ? getTVDetails(id) : getMovieDetails(id)
          )
        )
        setCandidateIds(data.candidateIds)
        setCandidates(movies)
        setCurrentIndex(0)
        setStep("compare")
      } else {
        setStep("done")
        setTimeout(() => {
          setOpen(false)
          router.refresh()
        }, 800)
      }
    } catch (err) {
      console.error("Failed to save rating:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleComparison(winnerId: number, loserId: number) {
    try {
      await fetch("/api/ratings/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, loserId, mediaType }),
      })
    } catch (err) {
      console.error("Comparison failed:", err)
    }

    if (currentIndex + 1 >= candidates.length) {
      setStep("done")
      setTimeout(() => {
        setOpen(false)
        router.refresh()
      }, 800)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  function handleSkipComparisons() {
    setOpen(false)
    router.refresh()
  }

  const opponent = candidates[currentIndex]
  const progress = candidates.length > 0 ? (currentIndex / candidates.length) * 100 : 0

  return (
    <>
      <span onClick={handleOpen} className="cursor-pointer">
        {trigger}
      </span>

      <Dialog open={open} onOpenChange={(o) => { if (!o) { setOpen(false) } }}>
        <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md">

          {/* Step 1: Tier picker */}
          {step === "tier" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-white">
                  How was it?
                </DialogTitle>
                <p className="text-center text-sm text-white/50">{getTitle(movie)}</p>
              </DialogHeader>

              <div className="flex flex-col gap-2 py-2">
                {TIERS.map((tier) => (
                  <button
                    key={tier.label}
                    onClick={() => !saving && handleTierPick(tier.label)}
                    disabled={saving}
                    className={`flex items-center gap-3 rounded-xl border border-white/5 px-4 py-3.5 text-left transition-all hover:border-white/20 hover:bg-white/5 active:scale-[0.98] disabled:opacity-50`}
                  >
                    <span className="text-2xl">{TIER_EMOJIS[tier.label]}</span>
                    <div>
                      <p className="font-semibold text-white">{tier.label}</p>
                    </div>
                    <div className={`ml-auto h-2 w-2 rounded-full ${tier.color}`} />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2: Comparisons */}
          {step === "compare" && opponent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-white">
                  Which did you prefer?
                </DialogTitle>
              </DialogHeader>

              {/* Progress */}
              <div className="flex flex-col gap-1">
                <div className="h-1 w-full rounded-full bg-white/10">
                  <div
                    className="h-1 rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-white/30">
                  {currentIndex + 1} of {candidates.length}
                </p>
              </div>

              {/* VS cards */}
              <div className="flex gap-3">
                {[
                  { m: movie, isWinner: true },
                  { m: opponent, isWinner: false },
                ].map(({ m, isWinner }) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      isWinner
                        ? handleComparison(movie.id, opponent.id)
                        : handleComparison(opponent.id, movie.id)
                    }
                    className="group flex-1 flex flex-col gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:border-green-500/60 hover:bg-white/5 active:scale-[0.97]"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-800">
                      <Image
                        src={getPosterUrl(m.poster_path)}
                        alt={getTitle(m)}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <p className="text-center text-xs font-medium text-white/80 line-clamp-2 leading-tight">
                      {getTitle(m)}
                    </p>
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-white/30 hover:text-white/60"
                onClick={handleSkipComparisons}
              >
                Skip
              </Button>
            </>
          )}

          {/* Step 3: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <span className="text-4xl">✅</span>
              <p className="font-semibold text-white">Added to your rankings!</p>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </>
  )
}
