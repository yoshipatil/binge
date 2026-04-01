// GET /api/share/card?userId=<id>&type=<stories|preview>
// Returns a PNG image of the user's Top 5 ranked movies + TV shows.
// type=stories → 1080×1920 (Instagram Stories)
// type=preview → 600×600 (iMessage / Twitter square)
//
// Uses @vercel/og (ImageResponse) which bundles satori + WASM resvg internally —
// no native binaries needed, works on Vercel Node.js runtime.

import { type NextRequest } from "next/server"
import { ImageResponse } from "@vercel/og"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"

export const runtime = "nodejs"

const TMDB_IMG = "https://image.tmdb.org/t/p"

// ── Types ──────────────────────────────────────────────────────────────────────
interface RankedItem {
  rank: number
  title: string
  year: string
  posterDataUrl: string | null
  score: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function fetchItemDetails(tmdbId: number, mediaType: string) {
  try {
    const d = mediaType === "tv" ? await getTVDetails(tmdbId) : await getMovieDetails(tmdbId)
    const raw = d as unknown as Record<string, unknown>
    const title = ((raw.title ?? raw.name ?? String(tmdbId)) as string).slice(0, 40)
    const dateStr = (raw.release_date ?? raw.first_air_date ?? "") as string
    const year = dateStr ? dateStr.slice(0, 4) : ""
    const poster = (raw.poster_path as string | null) ?? null
    return { title, year, poster }
  } catch {
    return { title: String(tmdbId), year: "", poster: null }
  }
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString("base64")
    const ct = res.headers.get("content-type") ?? "image/jpeg"
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  }
}

async function getFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { next: { revalidate: 86400 } })
  return res.arrayBuffer()
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const requestedUserId = searchParams.get("userId")
  const cardType = searchParams.get("type") ?? "preview"

  const session = await auth()
  const userId = requestedUserId ?? session?.user?.id
  if (!userId) return new Response("Unauthorized", { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, image: true },
  })
  if (!user) return new Response("Not found", { status: 404 })

  const allRatings = await prisma.rating.findMany({ where: { userId } })

  const movieRatings = normalizeEloScores(allRatings.filter((r) => r.mediaType !== "tv"))
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, 5)

  const tvRatings = normalizeEloScores(allRatings.filter((r) => r.mediaType === "tv"))
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, 5)

  const [movieDetails, tvDetails] = await Promise.all([
    Promise.all(movieRatings.map((r) => fetchItemDetails(r.tmdbId, r.mediaType))),
    Promise.all(tvRatings.map((r) => fetchItemDetails(r.tmdbId, "tv"))),
  ])

  const [moviePosters, tvPosters, avatarDataUrl, fontRegular, fontBold] = await Promise.all([
    Promise.all(movieDetails.map((d) => d.poster ? toDataUrl(`${TMDB_IMG}/w342${d.poster}`) : Promise.resolve(null))),
    Promise.all(tvDetails.map((d) => d.poster ? toDataUrl(`${TMDB_IMG}/w342${d.poster}`) : Promise.resolve(null))),
    user.image ? toDataUrl(user.image) : Promise.resolve(null),
    getFont("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff"),
    getFont("https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI4d_CVqgPqhQ.woff"),
  ])

  const movies: RankedItem[] = movieRatings.map((r, i) => ({
    rank: i + 1,
    title: movieDetails[i].title,
    year: movieDetails[i].year,
    posterDataUrl: moviePosters[i],
    score: Math.round(r.displayScore),
  }))

  const tv: RankedItem[] = tvRatings.map((r, i) => ({
    rank: i + 1,
    title: tvDetails[i].title,
    year: tvDetails[i].year,
    posterDataUrl: tvPosters[i],
    score: Math.round(r.displayScore),
  }))

  const isStories = cardType === "stories"
  const width = isStories ? 1080 : 600
  const height = isStories ? 1920 : 600
  const pad = isStories ? 72 : 40
  const posterW = isStories ? 96 : 52
  const posterH = isStories ? 144 : 78

  const userName = user.name ?? "Binge User"
  const handle = user.username ? `@${user.username}` : ""

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          background: "#000000",
          display: "flex",
          flexDirection: "column",
          padding: pad,
          fontFamily: "Inter",
        }}
      >
        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: isStories ? 56 : 28 }}>
          {/* Avatar */}
          {avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              width={isStories ? 80 : 44}
              height={isStories ? 80 : 44}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: "2px solid rgba(37,99,235,0.5)",
              }}
            />
          ) : (
            <div
              style={{
                width: isStories ? 80 : 44,
                height: isStories ? 80 : 44,
                borderRadius: "50%",
                background: "#1d2d4f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(37,99,235,0.3)",
              }}
            >
              <span style={{ color: "#60a5fa", fontSize: isStories ? 36 : 20, fontWeight: 700 }}>
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Name + handle */}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: isStories ? 24 : 14 }}>
            <span style={{ color: "#fff", fontSize: isStories ? 32 : 18, fontWeight: 700, lineHeight: 1.2 }}>
              {userName}
            </span>
            {handle ? (
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: isStories ? 22 : 13, marginTop: 2 }}>
                {handle}
              </span>
            ) : null}
          </div>

          {/* Binge logo (right) */}
          <div style={{ display: "flex", alignItems: "center", marginLeft: "auto", gap: 8 }}>
            <div
              style={{
                width: isStories ? 36 : 22,
                height: isStories ? 36 : 22,
                background: "#2563EB",
                borderRadius: isStories ? 8 : 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: isStories ? 18 : 11, fontWeight: 800 }}>B</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: isStories ? 24 : 14, fontWeight: 700 }}>
              Binge
            </span>
          </div>
        </div>

        {/* ── Section title ── */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: isStories ? 36 : 20, gap: 12 }}>
          <div style={{ width: isStories ? 4 : 3, height: isStories ? 32 : 18, background: "#2563EB", borderRadius: 2 }} />
          <span style={{ color: "#fff", fontSize: isStories ? 36 : 20, fontWeight: 800, letterSpacing: "-0.5px" }}>
            My All-Time Top 5
          </span>
        </div>

        {/* ── Movies ── */}
        {movies.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: isStories ? 10 : 6, marginBottom: isStories ? 32 : 16 }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: isStories ? 18 : 10, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: isStories ? 6 : 3 }}>
              🎬 Movies
            </span>
            {movies.map((item) => (
              <RankRow key={item.rank} item={item} isStories={isStories} posterW={posterW} posterH={posterH} />
            ))}
          </div>
        )}

        {/* ── TV ── */}
        {tv.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: isStories ? 10 : 6 }}>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: isStories ? 18 : 10, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: isStories ? 6 : 3 }}>
              📺 TV Shows
            </span>
            {tv.map((item) => (
              <RankRow key={item.rank} item={item} isStories={isStories} posterW={posterW} posterH={posterH} />
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{ marginTop: "auto", display: "flex", justifyContent: "center", paddingTop: isStories ? 40 : 20 }}>
          <span style={{ color: "rgba(255,255,255,0.18)", fontSize: isStories ? 20 : 11 }}>
            binge.app · Rank what you watch
          </span>
        </div>
      </div>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
        { name: "Inter", data: fontBold, weight: 700, style: "normal" },
      ],
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
        "Content-Disposition": `inline; filename="binge-top5.png"`,
      },
    }
  )
}

function RankRow({
  item,
  isStories,
  posterW,
  posterH,
}: {
  item: RankedItem
  isStories: boolean
  posterW: number
  posterH: number
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: isStories ? 18 : 10,
        background: "rgba(255,255,255,0.04)",
        borderRadius: isStories ? 14 : 8,
        padding: isStories ? "14px 18px" : "8px 10px",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Rank */}
      <span
        style={{
          color: item.rank === 1 ? "#2563EB" : "rgba(255,255,255,0.2)",
          fontSize: isStories ? 44 : 24,
          fontWeight: 800,
          width: isStories ? 52 : 28,
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {item.rank}
      </span>

      {/* Poster */}
      {item.posterDataUrl ? (
        <img
          src={item.posterDataUrl}
          width={posterW}
          height={posterH}
          style={{ borderRadius: isStories ? 8 : 4, objectFit: "cover" }}
        />
      ) : (
        <div style={{ width: posterW, height: posterH, background: "#1a1a2e", borderRadius: isStories ? 8 : 4 }} />
      )}

      {/* Info */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: isStories ? 6 : 3 }}>
        <span style={{ color: "#fff", fontSize: isStories ? 26 : 14, fontWeight: 700, lineHeight: 1.3 }}>
          {item.title}
        </span>
        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: isStories ? 20 : 11 }}>
          {item.year}
        </span>
        {/* Score bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: isStories ? 4 : 2 }}>
          <div style={{ width: Math.max(isStories ? item.score * 1.2 : item.score * 0.6, 4), height: isStories ? 4 : 3, background: "#2563EB", borderRadius: 2 }} />
          <span style={{ color: "#60a5fa", fontSize: isStories ? 18 : 10, fontWeight: 600 }}>
            {item.score}
          </span>
        </div>
      </div>
    </div>
  )
}
