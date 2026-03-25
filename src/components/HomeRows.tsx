import MovieRow from "@/components/MovieRow"
import {
  getTrending,
  getPopularMovies,
  getPopularTV,
  getTopRated,
  getMoviesByGenre,
  discoverByProvider,
  MOVIE_GENRES,
  STREAMING_SERVICES,
} from "@/lib/tmdb"

export default async function HomeRows({ streaming }: { streaming?: string }) {
  // When a streaming service is selected, show content available on that service
  if (streaming) {
    const providerIds = streaming.split(",").map(Number).filter(Boolean)
    const rows = await Promise.all(
      providerIds.flatMap((id) => {
        const service = STREAMING_SERVICES.find((s) => s.id === id)
        const name = service?.name ?? "Service"
        return [
          discoverByProvider(id, "movie").then((r) => ({ title: `Movies on ${name}`, movies: r.results, type: "movie" as const })),
          discoverByProvider(id, "tv").then((r) => ({ title: `Shows on ${name}`, movies: r.results, type: "tv" as const })),
        ]
      })
    )
    return (
      <div className="flex flex-col gap-8">
        {rows.map((row) => (
          <MovieRow key={row.title} title={row.title} movies={row.movies} mediaType={row.type} />
        ))}
      </div>
    )
  }

  // Default: fetch all rows in parallel
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
