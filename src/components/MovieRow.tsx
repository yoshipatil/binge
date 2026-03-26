"use client"

import { useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
          {movies.filter(m => m.poster_path).map((movie) => (
            <MoviePosterCard key={movie.id} movie={movie} mediaType={mediaType} />
          ))}
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

  return (
    <Link
      href={`/movie/${movie.id}?type=${mediaType}`}
      className="group/card relative flex-shrink-0 cursor-pointer"
      style={{ width: "130px" }}
    >
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
      </div>

      {/* Title below poster */}
      <div className="mt-1.5 px-0.5">
        <p className="truncate text-[11px] font-medium text-white/70 group-hover/card:text-white/90 transition-colors">
          {title}
        </p>
        <p className="text-[10px] text-white/30">{year}</p>
      </div>
    </Link>
  )
}
