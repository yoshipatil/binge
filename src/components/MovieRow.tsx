"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Star, Plus } from "lucide-react"
import { getPosterUrl } from "@/lib/tmdb"
import { getTitle, getReleaseYear, type TMDBMovie } from "@/types"

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
      <h2 className="mb-3 px-4 text-base font-semibold text-white sm:px-8 md:px-12">{title}</h2>

      <div className="relative">
        {/* Left arrow */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-r from-black/80 to-transparent opacity-0 transition-opacity group-hover/row:flex group-hover/row:opacity-100 sm:left-4 md:left-8"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>

        {/* Scroll container */}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide sm:gap-3 sm:px-8 md:px-12"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {movies.filter(m => m.poster_path).map((movie) => (
            <MoviePosterCard key={movie.id} movie={movie} mediaType={mediaType} />
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 z-10 hidden h-full w-10 items-center justify-center bg-gradient-to-l from-black/80 to-transparent opacity-0 transition-opacity group-hover/row:flex group-hover/row:opacity-100 sm:right-4 md:right-8"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>
    </section>
  )
}

function MoviePosterCard({ movie, mediaType }: { movie: TMDBMovie; mediaType: "movie" | "tv" }) {
  const title = getTitle(movie)
  const year = getReleaseYear(movie)

  return (
    <Link
      href={`/movie/${movie.id}?type=${mediaType}`}
      className="group/card relative flex-shrink-0 cursor-pointer"
      style={{ width: "130px" }}
    >
      {/* Poster */}
      <div className="relative overflow-hidden rounded-md" style={{ width: "130px", height: "195px" }}>
        <Image
          src={getPosterUrl(movie.poster_path, "w342")}
          alt={title}
          fill
          sizes="130px"
          className="object-cover transition-transform duration-300 group-hover/card:scale-105"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
          <Link
            href={`/movie/${movie.id}?type=${mediaType}`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
          >
            <Star className="h-4 w-4" />
          </Link>
          <button
            onClick={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              await fetch("/api/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tmdbId: movie.id, mediaType }),
              })
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 text-white transition-transform hover:scale-110"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Title below poster */}
      <div className="mt-1.5 px-0.5">
        <p className="truncate text-xs font-medium text-white/80">{title}</p>
        <p className="text-xs text-white/40">{year}</p>
      </div>
    </Link>
  )
}
