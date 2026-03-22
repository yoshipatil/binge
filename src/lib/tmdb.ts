// Central TMDB API client — all movie data flows through here
// Uses Next.js ISR caching (revalidate every hour) to stay within TMDB rate limits
// Attribution required by TMDB ToS — shown in app footer

import type { TMDBMovie, TMDBSearchResponse } from "@/types"

const BASE = "https://api.themoviedb.org/3"
const IMG = "https://image.tmdb.org/t/p"

async function tmdbFetch<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!)
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 }, // cache for 1 hour
  })

  if (!res.ok) {
    throw new Error(`TMDB API error: ${res.status} on ${path}`)
  }

  return res.json() as Promise<T>
}

// Get poster image URL — defaults to w342 (good for cards)
export function getPosterUrl(
  path: string | null,
  size: "w154" | "w342" | "w500" | "original" = "w342"
): string {
  if (!path) return "/placeholder-poster.png"
  return `${IMG}/${size}${path}`
}

// Get backdrop image URL — used for movie detail hero
export function getBackdropUrl(
  path: string | null,
  size: "w780" | "w1280" | "original" = "w1280"
): string {
  if (!path) return ""
  return `${IMG}/${size}${path}`
}

// Search both movies and TV shows at once
export function searchMulti(query: string): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>("/search/multi", {
    query,
    include_adult: "false",
  })
}

// Get full movie details (includes genres, runtime, etc.)
export function getMovieDetails(tmdbId: number): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/movie/${tmdbId}`)
}

// Get full TV show details
export function getTVDetails(tmdbId: number): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/tv/${tmdbId}`)
}

// Get TMDB's recommendations for a movie
export function getMovieRecommendations(tmdbId: number): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>(`/movie/${tmdbId}/recommendations`)
}

// Get TMDB's recommendations for a TV show
export function getTVRecommendations(tmdbId: number): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>(`/tv/${tmdbId}/recommendations`)
}

// Fetch full details for a list of IDs — runs in parallel
export async function getMultipleMovies(
  items: { tmdbId: number; mediaType: string }[]
): Promise<TMDBMovie[]> {
  return Promise.all(
    items.map(({ tmdbId, mediaType }) =>
      mediaType === "tv" ? getTVDetails(tmdbId) : getMovieDetails(tmdbId)
    )
  )
}

// Home page rows
export function getTrending(type: "movie" | "tv" | "all" = "all"): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>(`/trending/${type}/week`)
}

export function getPopularMovies(): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>("/movie/popular")
}

export function getPopularTV(): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>("/tv/popular")
}

export function getTopRated(): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>("/movie/top_rated")
}

export function getMoviesByGenre(genreId: number): Promise<TMDBSearchResponse> {
  return tmdbFetch<TMDBSearchResponse>("/discover/movie", {
    with_genres: String(genreId),
    sort_by: "popularity.desc",
  })
}

// TMDB genre list for movies
export const MOVIE_GENRES = [
  { id: 28,    name: "Action" },
  { id: 35,    name: "Comedy" },
  { id: 27,    name: "Horror" },
  { id: 10749, name: "Romance" },
  { id: 878,   name: "Sci-Fi" },
  { id: 53,    name: "Thriller" },
  { id: 16,    name: "Animation" },
  { id: 99,    name: "Documentary" },
]
