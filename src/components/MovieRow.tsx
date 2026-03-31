"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Star } from "lucide-react"
import { getPosterUrl } from "@/lib/tmdb"
import { getTitle, getReleaseYear, type TMDBMovie } from "@/types"
import RateMovieDialog from "@/components/RateMovieDialog"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"

interface MovieRowProps {
  title: string
  movies: TMDBMovie[]
  mediaType?: "movie" | "tv"
}

export default function MovieRow({ title, movies, mediaType = "movie" }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" })
  }

  if (movies.length === 0) return null

  return (
    <section className="group/row relative">
      <h2 className="mb-3 px-4 text-[15px] font-bold tracking-tight text-white/90 sm:px-8 md:px-12">
        {title}
      </h2>

      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-black/80 to-transparent opacity-0 transition-opacity group-hover/row:flex group-hover/row:opacity-100 sm:left-4 md:left-8"
        >
          <ChevronLeft className="h-5 w-5 text-white/70" />
        </button>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide sm:gap-3 sm:px-8 md:px-12"
        >
          {movies.filter(m => m.poster_path).map((movie) => {
            const itemType = movie.media_type === "tv" ? "tv" : mediaType
            return <MoviePosterCard key={`${movie.id}-${itemType}`} movie={movie} mediaType={itemType} />
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-black/80 to-transparent opacity-0 transition-opacity group-hover/row:flex group-hover/row:opacity-100 sm:right-4 md:right-8"
        >
          <ChevronRight className="h-5 w-5 text-white/70" />
        </button>
      </div>
    </section>
  )
}

function MoviePosterCard({ movie, mediaType }: { movie: TMDBMovie; mediaType: "movie" | "tv" }) {
  const title = getTitle(movie)
  const year = getReleaseYear(movie)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [inWatchlist, setInWatchlist] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchMoved = useRef(false)

  function onTouchStart() {
    touchMoved.current = false
    timerRef.current = setTimeout(() => {
      if (!touchMoved.current) setSheetOpen(true)
    }, 500)
  }

  function onTouchMove() {
    touchMoved.current = true
    if (timerRef.current) clearTimeout(timerRef.current)
  }

  function onTouchEnd() {
    if (timerRef.current) clearTimeout(timerRef.current)
  }

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

  return (
    <>
      <div
        className="group/card relative flex-shrink-0 cursor-pointer select-none touch-manipulation"
        style={{ width: "130px" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onContextMenu={(e) => { e.preventDefault(); setSheetOpen(true) }}
      >
        <Link href={`/movie/${movie.id}?type=${mediaType}`}>
          {/* Poster */}
          <div
            className="relative overflow-hidden rounded-lg bg-zinc-900 transition-all duration-300 group-hover/card:shadow-[0_0_20px_rgba(37,99,235,0.2)] group-hover/card:ring-1 group-hover/card:ring-blue-500/20"
            style={{ width: "130px", height: "195px" }}
          >
            <Image
              src={getPosterUrl(movie.poster_path, "w342")}
              alt={title}
              fill
              sizes="130px"
              className="object-cover transition-transform duration-300 group-hover/card:scale-105"
            />

            {/* Desktop hover overlay — hidden on touch devices */}
            <div className="absolute inset-0 hidden flex-col items-center justify-end gap-1.5 bg-black/70 p-2 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 md:flex">
              <RateMovieDialog
                movie={movie}
                mediaType={mediaType}
                trigger={
                  <Button
                    size="sm"
                    className="h-8 w-full gap-1 border-0 bg-blue-600 text-xs text-white hover:bg-blue-500"
                    onClick={(e) => e.preventDefault()}
                  >
                    <Star className="h-3 w-3" />
                    Rate
                  </Button>
                }
              />
              <button
                onClick={(e) => { e.preventDefault(); toggleWatchlist() }}
                className="flex h-8 w-full items-center justify-center gap-1 rounded-md border border-white/15 bg-white/10 text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
              >
                {inWatchlist ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
                {inWatchlist ? "Saved" : "Watchlist"}
              </button>
            </div>
          </div>

          {/* Title below poster */}
          <div className="mt-1.5 px-0.5">
            <p className="truncate text-[11px] font-medium text-white/70 group-hover/card:text-white/90 transition-colors">
              {title}
            </p>
            <p className="text-[10px] text-white/30">{year}</p>
          </div>
        </Link>
      </div>

      {/* Bottom sheet on long-press */}
      {sheetOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-white/10 bg-zinc-900 shadow-2xl">
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <div className="border-b border-white/[0.06] px-5 pb-4 pt-3">
              <p className="truncate text-base font-bold text-white">{title}</p>
              <p className="mt-0.5 text-sm text-white/40">{year}</p>
            </div>
            <div className="flex flex-col gap-2 px-4 pb-8 pt-3">
              <RateMovieDialog
                movie={movie}
                mediaType={mediaType}
                trigger={
                  <Button
                    className="h-12 w-full gap-2 border-0 bg-blue-600 text-sm text-white hover:bg-blue-500"
                    onClick={() => setSheetOpen(false)}
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
                href={`/movie/${movie.id}?type=${mediaType}`}
                onClick={() => setSheetOpen(false)}
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
