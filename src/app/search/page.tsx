"use client"

import { useState, useCallback } from "react"
import SearchBar from "@/components/SearchBar"
import MovieCard from "@/components/MovieCard"
import RateMovieDialog from "@/components/RateMovieDialog"
import WatchlistButton from "@/components/WatchlistButton"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getMediaType, type TMDBMovie } from "@/types"
import { Star } from "lucide-react"

interface SearchResult extends TMDBMovie {
  appMediaType: "movie" | "tv" | "documentary"
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q)
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/movies/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch (err) {
      console.error("Search failed:", err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-muted-foreground">
          Find movies, TV shows, and documentaries to rate
        </p>
      </div>

      <div className="mb-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-[2/3] w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && query && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-lg font-semibold">No results for &quot;{query}&quot;</p>
          <p className="text-sm text-muted-foreground">Try a different title or keyword</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !query && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-4xl">🔍</p>
          <p className="text-lg font-semibold">What are you watching?</p>
          <p className="text-sm text-muted-foreground">Type to search millions of titles</p>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {results.map((movie) => {
            const mediaType = movie.appMediaType ?? getMediaType(movie)
            return (
              <MovieCard
                key={`${movie.id}-${mediaType}`}
                movie={movie}
                mediaType={mediaType}
                actions={
                  <div className="flex gap-1">
                    <RateMovieDialog
                      movie={movie}
                      mediaType={mediaType}
                      trigger={
                        <Button size="sm" className="h-7 flex-1 gap-1 text-xs">
                          <Star className="h-3 w-3" />
                          Rate
                        </Button>
                      }
                    />
                    <WatchlistButton
                      tmdbId={movie.id}
                      mediaType={mediaType}
                      initialInWatchlist={false}
                    />
                  </div>
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
