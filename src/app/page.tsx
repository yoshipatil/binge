import { getTrending } from "@/lib/tmdb"
import HomeHero from "@/components/HomeHero"
import HomeRows from "@/components/HomeRows"

export default async function HomePage() {
  // Fetch featured movie server-side for instant hero render
  let featured = null
  try {
    const trending = await getTrending("movie")
    const withBackdrop = trending.results.filter((m) => m.backdrop_path && m.overview)
    featured = withBackdrop[Math.floor(Math.random() * Math.min(5, withBackdrop.length))] ?? null
  } catch {
    featured = null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* HomeHero is a client component — handles search state and shows results overlay */}
      <HomeHero featured={featured} />

      {/* Always-rendered rows — hidden via CSS when search is active */}
      <div id="home-rows" className="pb-16 pt-6">
        <HomeRows />
      </div>
    </div>
  )
}
