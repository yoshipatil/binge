"use client"

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
import { getPosterUrl } from "@/lib/tmdb"
import { TIERS } from "@/lib/tiers"
import { getTitle, type TMDBMovie, type MediaType } from "@/types"
import { Loader2 } from "lucide-react"

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
  trigger: React.ReactNode
}

type Step = "tier" | "compare" | "done"

export default function RateMovieDialog({ movie, mediaType, trigger }: RateMovieDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>("tier")
  const [candidates, setCandidates] = useState<TMDBMovie[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [activeTier, setActiveTier] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setOpen(true)
    setStep("tier")
    setCandidates([])
    setCurrentIndex(0)
    setSaving(false)
    setActiveTier(null)
    setError(null)
  }

  async function handleTierPick(tierLabel: string) {
    if (saving) return
    const seedScore = TIER_SEED_SCORES[tierLabel]
    if (seedScore === undefined) {
      setError("Invalid tier selection. Please try again.")
      return
    }
    setSaving(true)
    setActiveTier(tierLabel)
    setError(null)

    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: movie.id,
          mediaType,
          seedScore,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Server error ${res.status}`)
      }

      const data = await res.json()

      if (data.candidates?.length > 0) {
        setCandidates(data.candidates)
        setCurrentIndex(0)
        setStep("compare")
      } else {
        setStep("done")
        setTimeout(() => { setOpen(false); router.refresh() }, 900)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.")
    } finally {
      setSaving(false)
      setActiveTier(null)
    }
  }

  async function handleComparison(winnerId: number, loserId: number) {
    try {
      const res = await fetch("/api/ratings/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, loserId, mediaType }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        // Non-fatal: log the error but keep the comparison flow going
        console.error("Comparison failed:", err.error ?? res.status)
      }
    } catch (err) {
      console.error("Comparison network error:", err)
    }

    if (currentIndex + 1 >= candidates.length) {
      setStep("done")
      setTimeout(() => { setOpen(false); router.refresh() }, 900)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const opponent = candidates[currentIndex]
  const progress = candidates.length > 0 ? (currentIndex / candidates.length) * 100 : 0

  return (
    <>
      <span onClick={handleOpen} className="cursor-pointer">
        {trigger}
      </span>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
        <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md">

          {/* Tier picker */}
          {step === "tier" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-white">How was it?</DialogTitle>
                <p className="text-center text-sm text-white/40">{getTitle(movie)}</p>
              </DialogHeader>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2 py-1">
                {TIERS.map((tier) => {
                  const isLoading = saving && activeTier === tier.label
                  return (
                    <button
                      key={tier.label}
                      onClick={() => handleTierPick(tier.label)}
                      disabled={saving}
                      className="flex items-center gap-3 rounded-xl border border-white/5 px-4 py-3.5 text-left transition-all hover:border-white/20 hover:bg-white/5 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="text-xl">
                        {isLoading
                          ? <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                          : TIER_EMOJIS[tier.label]
                        }
                      </span>
                      <span className="font-semibold text-white">{tier.label}</span>
                      <div className={`ml-auto h-2 w-2 flex-shrink-0 rounded-full ${tier.color}`} />
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Head-to-head comparisons */}
          {step === "compare" && opponent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-white">Which did you prefer?</DialogTitle>
              </DialogHeader>

              <div className="flex flex-col gap-1">
                <div className="h-1 w-full rounded-full bg-white/10">
                  <div
                    className="h-1 rounded-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-xs text-white/30">
                  {currentIndex + 1} of {candidates.length}
                </p>
              </div>

              <div className="flex gap-3">
                {([{ m: movie, win: true }, { m: opponent, win: false }] as const).map(({ m, win }) => (
                  <button
                    key={m.id}
                    onClick={() =>
                      win
                        ? handleComparison(movie.id, opponent.id)
                        : handleComparison(opponent.id, movie.id)
                    }
                    className="group flex-1 flex flex-col gap-2 rounded-xl border-2 border-transparent p-2 transition-all hover:border-blue-500/60 hover:bg-white/5 active:scale-[0.97]"
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
                onClick={() => { setOpen(false); router.refresh() }}
              >
                Skip comparisons
              </Button>
            </>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="text-5xl">✅</span>
              <p className="text-lg font-semibold text-white">Added to your rankings!</p>
            </div>
          )}

        </DialogContent>
      </Dialog>
    </>
  )
}
