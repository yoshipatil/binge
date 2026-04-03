// Shared TypeScript types used across the app

// TMDB API response shapes (only fields we actually use)
export interface TMDBMovie {
  id: number
  title?: string // movies use "title"
  name?: string // TV shows use "name"
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date?: string // movies
  first_air_date?: string // TV shows
  vote_average: number
  vote_count: number
  genre_ids?: number[]
  genres?: { id: number; name: string }[]
  runtime?: number | null
  number_of_seasons?: number
  number_of_episodes?: number
  seasons?: { season_number: number; episode_count: number; name: string; poster_path: string | null }[]
  media_type?: "movie" | "tv" | "person"
}

export interface TMDBSearchResponse {
  results: TMDBMovie[]
  total_results: number
  total_pages: number
}

// Our media type classification
export type MediaType = "movie" | "tv" | "documentary"

// A rating from our DB enriched with TMDB movie data
export interface RatedItem {
  rating: {
    id: string
    tmdbId: number
    mediaType: MediaType
    seedScore: number
    eloScore: number
    displayScore: number
    review: string | null
    watchedAt: string
  }
  movie: TMDBMovie
}

// A watchlist item from our DB enriched with TMDB data
export interface WatchlistItem {
  watchlist: {
    id: string
    tmdbId: number
    mediaType: MediaType
    addedAt: string
  }
  movie: TMDBMovie
}

// TMDB TV season/episode types
export interface TMDBEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string | null
  runtime: number | null
}

export interface TMDBSeason {
  id: number
  name: string
  season_number: number
  episode_count: number
  air_date: string | null
  poster_path: string | null
  episodes: TMDBEpisode[]
}

// TMDB genre
export interface Genre {
  id: number
  name: string
}

// DOCUMENTARY genre ID in TMDB
export const DOCUMENTARY_GENRE_ID = 99

// Helper: get display title for a TMDB item (movies use "title", TV uses "name")
export function getTitle(movie: TMDBMovie): string {
  return movie.title ?? movie.name ?? "Unknown"
}

// Helper: get release year
export function getReleaseYear(movie: TMDBMovie): string {
  const date = movie.release_date ?? movie.first_air_date
  return date ? new Date(date).getFullYear().toString() : ""
}

// Helper: determine our MediaType from a TMDB result
export function getMediaType(movie: TMDBMovie): MediaType {
  if (movie.genre_ids?.includes(DOCUMENTARY_GENRE_ID) || movie.genres?.some(g => g.id === DOCUMENTARY_GENRE_ID)) {
    return "documentary"
  }
  if (movie.media_type === "tv") return "tv"
  return "movie"
}
