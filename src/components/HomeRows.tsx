import MovieRow from "@/components/MovieRow"
import {
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRated,
  getMoviesByGenre,
  MOVIE_GENRES,
} from "@/lib/tmdb"

export default async function HomeRows() {
  // Fetch all rows in parallel
  const [trending, popularMovies, popularTV, topRated, ...genreResults] = await Promise.all([
    getTrending("all"),
    getPopularMovies(),
    getPopularTV(),
    getTopRated(),
    ...MOVIE_GENRES.slice(0, 4).map((g) => getMoviesByGenre(g.id)),
  ])

  const rows = [
    { title: "Trending This Week", movies: trending.results, type: "movie" as const },
    { title: "Popular Movies", movies: popularMovies.results, type: "movie" as const },
    { title: "Popular TV Shows", movies: popularTV.results, type: "tv" as const },
    { title: "Top Rated All Time", movies: topRated.results, type: "movie" as const },
    ...MOVIE_GENRES.slice(0, 4).map((g, i) => ({
      title: g.name,
      movies: genreResults[i]?.results ?? [],
      type: "movie" as const,
    })),
  ]

  return (
    <div className="flex flex-col gap-8">
      {rows.map((row) => (
        <MovieRow
          key={row.title}
          title={row.title}
          movies={row.movies}
          mediaType={row.type}
        />
      ))}
    </div>
  )
}
