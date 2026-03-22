"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, X, Star, Plus } from "lucide-react"
import { getPosterUrl, getBackdropUrl } from "@/lib/tmdb"
import { getTitle, getReleaseYear, getMediaType, type TMDBMovie } from "@/types"
import RateMovieDialog from "@/components/RateMovieDialog"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface SearchResult extends TMDBMovie {
  appMediaType: "movie" | "tv" | "documentary"
}

interface HomeHeroProps {
  featured: TMDBMovie | null
}

export default function HomeHero({ featured }: HomeHeroProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const isSearching = query.trim().length > 0

  // Show/hide home rows based on search state
  useEffect(() => {
    const rows = document.getElementById("home-rows")
    if (rows) {
      rows.style.display = isSearching ? "none" : "block"
    }
  }, [isSearching])

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(query), 350)
    return () => clearTimeout(timer)
  }, [query, handleSearch])

  return (
    <>
      {/* Hero section */}
      <div className="relative h-[50vh] min-h-[320px] w-full overflow-hidden">
        {featured?.backdrop_path ? (
          <Image
            src={getBackdropUrl(featured.backdrop_path, "w1280")}
            alt={getTitle(featured)}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 to-black" />
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />

        {/* Hero text + search */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-8 sm:px-8 md:px-12">
          {featured && !isSearching && (
            <div className="mb-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-green-400">
                Trending Now
              </p>
              <h1 className="text-2xl font-bold text-white drop-shadow-lg sm:text-3xl md:text-4xl">
                {getTitle(featured)}
              </h1>
              <p className="mt-1.5 line-clamp-2 max-w-lg text-sm text-white/55 drop-shadow">
                {featured.overview}
              </p>
            </div>
          )}

          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, shows, documentaries..."
              className="h-11 w-full rounded-xl border border-white/10 bg-black/50 pl-10 pr-10 text-sm text-white placeholder:text-white/35 backdrop-blur-xl focus:border-green-500/50 focus:bg-black/70 focus:outline-none focus:ring-1 focus:ring-green-500/30 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search results — shown below hero when searching */}
      {isSearching && (
        <div className="px-4 pb-16 pt-6 sm:px-8 md:px-12">
          {loading ? (
            <>
              <Skeleton className="mb-4 h-4 w-32 bg-white/10" />
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {Array.from({ length: 16 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] w-full rounded-md bg-white/10" />
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-white/40">
                {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
              </p>

              {results.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <p className="text-lg font-semibold text-white">No results found</p>
                  <p className="text-sm text-white/40">Try a different title</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {results.map((movie) => {
                    if (!movie.poster_path) return null
                    const mediaType = movie.appMediaType ?? getMediaType(movie)
                    return (
                      <SearchCard key={`${movie.id}-${mediaType}`} movie={movie} mediaType={mediaType} />
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}

function SearchCard({
  movie,
  mediaType,
}: {
  movie: TMDBMovie
  mediaType: "movie" | "tv" | "documentary"
}) {
  const title = getTitle(movie)
  const year = getReleaseYear(movie)

  return (
    <div className="group relative flex flex-col">
      <Link
        href={`/movie/${movie.id}?type=${mediaType === "documentary" ? "movie" : mediaType}`}
        className="block"
      >
        <div className="relative overflow-hidden rounded-md bg-zinc-900" style={{ aspectRatio: "2/3" }}>
          <Image
            src={getPosterUrl(movie.poster_path, "w342")}
            alt={title}
            fill
            sizes="(max-width: 640px) 33vw, 12vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={async (e) => {
                e.preventDefault()
                await fetch("/api/watchlist", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tmdbId: movie.id, mediaType }),
                })
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/60 text-white hover:bg-white/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Link>

      <div className="mt-1.5 flex-1">
        <p className="truncate text-xs font-medium text-white/80">{title}</p>
        <p className="text-xs text-white/40">{year}</p>
      </div>

      <div className="mt-1">
        <RateMovieDialog
          movie={movie}
          mediaType={mediaType}
          trigger={
            <Button
              size="sm"
              className="h-6 w-full gap-1 text-xs bg-green-600 hover:bg-green-500 text-white border-0"
            >
              <Star className="h-3 w-3" />
              Rate
            </Button>
          }
        />
      </div>
    </div>
  )
}
