"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import RatingSlider from "@/components/RatingSlider"
import CompareMoviesDialog from "@/components/CompareMoviesDialog"
import { getTitle, type TMDBMovie, type MediaType } from "@/types"

interface RateMovieDialogProps {
  movie: TMDBMovie
  mediaType: MediaType
  existingScore?: number
  trigger: React.ReactNode
}

export default function RateMovieDialog({
  movie,
  mediaType,
  existingScore,
  trigger,
}: RateMovieDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(existingScore ?? 7.0)
  const [review, setReview] = useState("")
  const [saving, setSaving] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [candidateIds, setCandidateIds] = useState<number[]>([])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: movie.id,
          mediaType,
          seedScore: score,
          review: review.trim() || null,
        }),
      })

      const data = await res.json()

      if (data.candidateIds?.length > 0) {
        setCandidateIds(data.candidateIds)
        setOpen(false)
        setCompareOpen(true)
      } else {
        setOpen(false)
        router.refresh()
      }
    } catch (err) {
      console.error("Failed to save rating:", err)
    } finally {
      setSaving(false)
    }
  }

  function handleCompareFinish() {
    setCompareOpen(false)
    router.refresh()
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Rate this {mediaType}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-2">
            <p className="text-center text-sm text-muted-foreground font-medium">
              {getTitle(movie)}
            </p>

            <RatingSlider value={score} onChange={setScore} />

            <textarea
              placeholder="Add a note (optional)..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="min-h-[80px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : existingScore ? "Update Rating" : "Rate & Compare"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {compareOpen && (
        <CompareMoviesDialog
          newMovie={movie}
          newMovieMediaType={mediaType}
          candidateIds={candidateIds}
          onFinish={handleCompareFinish}
        />
      )}
    </>
  )
}
