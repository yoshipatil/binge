import { Suspense } from "react"
import { getTrending } from "@/lib/tmdb"
import HomeHero from "@/components/HomeHero"
import HomeRows from "@/components/HomeRows"
import StreamingFilter from "@/components/StreamingFilter"

interface HomePageProps {
  searchParams: Promise<{ streaming?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { streaming } = await searchParams

  let featured = null
  try {
    const trending = await getTrending("movie")
    const withBackdrop = trending.results.filter((m) => m.backdrop_path && m.overview)
    // eslint-disable-next-line react-hooks/purity -- intentional: server component, random runs once per request on the server
    featured = withBackdrop[Math.floor(Math.random() * Math.min(5, withBackdrop.length))] ?? null
  } catch {
    featured = null
  }

  return (
    <div className="min-h-screen bg-black">
      <HomeHero featured={featured} />

      <div id="home-rows" className="pb-16 pt-6">
        <div className="px-6 pb-4">
          <Suspense fallback={null}>
            <StreamingFilter />
          </Suspense>
        </div>
        <HomeRows streaming={streaming} />
      </div>
    </div>
  )
}
