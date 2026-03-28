"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"
import { Star, Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import RateMovieDialog from "@/components/RateMovieDialog"
import { getTitle, getReleaseYear, type TMDBMovie, type MediaType } from "@/types"
import toast from "react-hot-toast"

interface MovieCardSheetProps {
  movie: TMDBMovie
  mediaType: MediaType
  initialInWatchlist?: boolean
  children: React.ReactNode
}

export default function MovieCardSheet({
  movie,
  mediaType,
  initialInWatchlist = false,
  children,
}: MovieCardSheetProps) {
  const [open, setOpen] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchMoved = useRef(false)

  const handleTouchStart = useCallback(() => {
    touchMoved.current = false
    timerRef.current = setTimeout(() => {
      if (!touchMoved.current) setOpen(true)
    }, 500)
  }, [])

  const handleTouchMove = useCallback(() => {
    touchMoved.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(true)
  }, [])

  async function toggleWatchlist() {
    const was = inWatchlist
    setInWatchlist(!was)
    try {
      const res = was
        ? await fetch(`/api/watchlist?tmdbId=${movie.id}&mediaType=${mediaType}`, { method: "DELETE" })
        : await fetch("/api/watchlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tmdbId: movie.id, mediaType }),
          })
      if (!res.ok) {
        setInWatchlist(was)
        if (res.status === 401) { window.location.href = "/sign-in"; return }
        toast.error("Failed to update watchlist")
      } else {
        toast.success(was ? "Removed from watchlist" : "Added to watchlist")
      }
    } catch {
      setInWatchlist(was)
      toast.error("Network error")
    }
  }

  const title = getTitle(movie)
  const year = getReleaseYear(movie)
  const href = `/movie/${movie.id}?type=${mediaType === "documentary" ? "movie" : mediaType}`

  return (
    <>
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
        className="select-none"
      >
        {children}
      </div>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Bottom sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-white/10 bg-zinc-900 shadow-2xl">
            {/* Drag handle */}
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Movie info */}
            <div className="border-b border-white/[0.06] px-5 pb-4 pt-3">
              <p className="truncate text-base font-bold text-white">{title}</p>
              <p className="mt-0.5 text-sm text-white/40">{year}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 px-4 pb-8 pt-3">
              <RateMovieDialog
                movie={movie}
                mediaType={mediaType}
                trigger={
                  <Button
                    className="h-12 w-full gap-2 border-0 bg-blue-600 text-sm text-white hover:bg-blue-500"
                    onClick={() => setOpen(false)}
                  >
                    <Star className="h-4 w-4" />
                    Rate this
                  </Button>
                }
              />

              <button
                onClick={toggleWatchlist}
                className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors ${
                  inWatchlist
                    ? "border-white/10 bg-white/10 text-white"
                    : "border-white/10 bg-transparent text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                {inWatchlist ? (
                  <BookmarkCheck className="h-4 w-4" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                {inWatchlist ? "In watchlist" : "Save to watchlist"}
              </button>

              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-white/50 transition-colors hover:text-white/80"
              >
                View details
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  )
}
