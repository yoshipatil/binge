"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
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
import {
  Loader2, Trophy, Heart, Star, ThumbsUp, Minus, ThumbsDown, CheckCircle2,
} from "lucide-react"
import toast from "react-hot-toast"

const ease = [0.16, 1, 0.3, 1] as const

const TIER_SEED_SCORES: Record<string, number> = {
  "All-Time":       9.5,
  "Loved It":       8.5,
  "Really Good":    7.5,
  "Good":           6.5,
  "Mid":            5.5,
  "Didn't Like It": 3.0,
}

const TIER_ICONS: Record<string, React.ElementType> = {
  "All-Time":       Trophy,
  "Loved It":       Heart,
  "Really Good":    Star,
  "Good":           ThumbsUp,
  "Mid":            Minus,
  "Didn't Like It": ThumbsDown,
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
        body: JSON.stringify({ tmdbId: movie.id, mediaType, seedScore }),
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
        toast.success(`Ranked: ${getTitle(movie)}`)
        setTimeout(() => { setOpen(false); router.refresh() }, 800)
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
        console.error("Comparison failed:", err.error ?? res.status)
      }
    } catch (err) {
      console.error("Comparison network error:", err)
    }

    if (currentIndex + 1 >= candidates.length) {
      setStep("done")
      toast.success(`Ranked: ${getTitle(movie)}`)
      setTimeout(() => { setOpen(false); router.refresh() }, 800)
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const opponent = candidates[currentIndex]
  const progress = candidates.length > 0 ? ((currentIndex + 1) / candidates.length) * 100 : 0

  return (
    <>
      <span onClick={handleOpen} className="cursor-pointer">
        {trigger}
      </span>

      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
        <DialogContent className="border-white/10 bg-zinc-950 text-white sm:max-w-md overflow-hidden p-0">
          <AnimatePresence mode="wait">

            {/* ── Tier picker ── */}
            {step === "tier" && (
              <motion.div
                key="tier"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18, ease }}
                className="p-6"
              >
                {/* Movie context — poster + title */}
                <div className="mb-4 flex items-center gap-3">
                  {movie.poster_path && (
                    <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-md bg-zinc-800">
                      <Image
                        src={getPosterUrl(movie.poster_path, "w154")}
                        alt={getTitle(movie)}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <DialogHeader className="p-0">
                      <DialogTitle className="text-left text-base text-white leading-tight">{getTitle(movie)}</DialogTitle>
                    </DialogHeader>
                    <p className="mt-0.5 text-sm text-white/40">How was it?</p>
                  </div>
                </div>

                {error && (
                  <p className="mb-3 rounded-lg bg-red-500/10 px-4 py-2 text-center text-sm text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex flex-col gap-1.5">
                  {TIERS.map((tier) => {
                    const isLoading = saving && activeTier === tier.label
                    const TierIcon = TIER_ICONS[tier.label]
                    return (
                      <motion.button
                        key={tier.label}
                        onClick={() => handleTierPick(tier.label)}
                        disabled={saving}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.1 }}
                        className={`flex min-h-[52px] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 ${tier.border}`}
                      >
                        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${tier.color}`}>
                          {isLoading
                            ? <Loader2 className={`h-4 w-4 animate-spin ${tier.text}`} />
                            : <TierIcon className={`h-4 w-4 ${tier.text}`} />
                          }
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-white">{tier.label}</span>
                          <span className="text-xs text-white/30">{tier.description}</span>
                        </div>
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Head-to-head comparison ── */}
            {step === "compare" && opponent && (
              <motion.div
                key={`compare-${currentIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2, ease }}
                className="p-6"
              >
                <DialogHeader>
                  <DialogTitle className="text-center text-white">Which did you prefer?</DialogTitle>
                </DialogHeader>

                {/* Progress bar */}
                <div className="mt-3 flex flex-col gap-1">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-1 rounded-full bg-blue-500"
                      initial={{ width: `${((currentIndex) / candidates.length) * 100}%` }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3, ease }}
                    />
                  </div>
                  <p className="text-center text-xs text-white/30">
                    {currentIndex + 1} of {candidates.length}
                  </p>
                </div>

                {/* Poster pair */}
                <div className="mt-4 flex gap-3">
                  {([
                    { m: movie,    onPick: () => handleComparison(movie.id, opponent.id) },
                    { m: opponent, onPick: () => handleComparison(opponent.id, movie.id) },
                  ] as const).map(({ m, onPick }) => (
                    <motion.button
                      key={m.id}
                      onClick={onPick}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ duration: 0.15, ease }}
                      className="group flex-1 flex flex-col gap-2 rounded-xl border-2 border-transparent p-2 hover:border-blue-500/50 hover:bg-white/5"
                    >
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-zinc-800">
                        <Image
                          src={getPosterUrl(m.poster_path)}
                          alt={getTitle(m)}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <p className="line-clamp-2 text-center text-xs font-medium leading-tight text-white/80">
                        {getTitle(m)}
                      </p>
                    </motion.button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  className="mt-3 w-full min-h-[44px] text-white/30 hover:text-white/60"
                  onClick={() => { setOpen(false); router.refresh() }}
                >
                  Skip comparisons
                </Button>
              </motion.div>
            )}

            {/* ── Done ── */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease }}
                className="flex flex-col items-center gap-4 py-10 px-6"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.05, type: "spring", stiffness: 280, damping: 22 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600"
                >
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.2, ease }}
                  className="text-base font-semibold text-white"
                >
                  Added to your rankings
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25, duration: 0.2 }}
                  className="text-sm text-white/40"
                >
                  {getTitle(movie)}
                </motion.p>
              </motion.div>
            )}

          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  )
}
