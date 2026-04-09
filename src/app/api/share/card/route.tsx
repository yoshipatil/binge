// GET /api/share/card?userId=<id>&type=<stories|preview>
// Returns a cinematic PNG of the user's Top 5 ranked titles.
// type=stories  → 1080×1920 (Instagram Stories / Reels)
// type=preview  → 600×600  (iMessage, Twitter, WhatsApp)
//
// Uses @vercel/og (satori + WASM resvg) — no native binaries needed.
// IMPORTANT: No emojis in JSX — satori has no emoji font loaded.

import { type NextRequest } from "next/server"
import { ImageResponse } from "@vercel/og"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rateLimit"

export const runtime = "nodejs"
export const maxDuration = 30

const TMDB_IMG = "https://image.tmdb.org/t/p"

// ── Types ──────────────────────────────────────────────────────────────────────
interface RankedItem {
  rank: number
  title: string
  year: string
  posterDataUrl: string | null
  score: number
  mediaType: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function fetchItemDetails(tmdbId: number, mediaType: string) {
  try {
    const d = mediaType === "tv" ? await getTVDetails(tmdbId) : await getMovieDetails(tmdbId)
    const raw = d as unknown as Record<string, unknown>
    const title = ((raw.title ?? raw.name ?? String(tmdbId)) as string).slice(0, 36)
    const dateStr = (raw.release_date ?? raw.first_air_date ?? "") as string
    const year = dateStr ? dateStr.slice(0, 4) : ""
    const poster = (raw.poster_path as string | null) ?? null
    return { title, year, poster }
  } catch {
    return { title: String(tmdbId), year: "", poster: null }
  }
}

async function toDataUrl(url: string): Promise<string | null> {
  // 3-second hard timeout per image — Vercel Hobby cap is 10s total,
  // so hanging image fetches are the primary cause of cold-start 504s.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 3000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString("base64")
    const ct = res.headers.get("content-type") ?? "image/jpeg"
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}


// ── Route handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Rate limit strictly — this is the most expensive endpoint (5 TMDB calls +
  // 5 poster fetches + 3 font fetches + OG image render per request).
  const { allowed, retryAfterMs } = checkRateLimit(
    `share-card:${getClientIp(request.headers)}`,
    20,
    60_000
  )
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const { searchParams } = request.nextUrl
  const requestedUserId = searchParams.get("userId")
  const cardType = searchParams.get("type") ?? "preview"

  // Only call auth() when userId isn't already in query params.
  // auth() throws in some mobile/PWA environments (cookie parsing), causing 500.
  let userId: string | null = requestedUserId
  if (!userId) {
    try {
      const session = await auth()
      userId = session?.user?.id ?? null
    } catch {
      // auth() is a fallback — if it fails, we just 401 below
    }
  }
  if (!userId) return new Response("Unauthorized", { status: 401 })

  // Parallel DB queries — Neon cold start can add 2-5s, so sequential
  // queries risk blowing through Vercel Hobby's 10s function timeout.
  const [user, allRatings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, username: true, image: true },
    }),
    prisma.rating.findMany({
      where: { userId },
      select: { tmdbId: true, mediaType: true, eloScore: true },
    }),
  ])
  if (!user) return new Response("Not found", { status: 404 })
  if (allRatings.length === 0) {
    return new Response("No ratings yet", { status: 400 })
  }

  // Normalize movies and TV separately — ELO scores are only comparable within
  // their own pool. Mixing them before normalizing produces wrong display scores
  // because the two pools have independent ELO ranges.
  // This matches the same algorithm used everywhere else in the app (profile page, etc.)
  const movieRatings = allRatings.filter((r) => r.mediaType !== "tv")
  const tvRatings = allRatings.filter((r) => r.mediaType === "tv")
  const normalizedMovies = normalizeEloScores(movieRatings)
  const normalizedTV = normalizeEloScores(tvRatings)
  const allNormalized = [...normalizedMovies, ...normalizedTV]

  const top5 = allNormalized
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, 5)

  const top5Details = await Promise.all(
    top5.map((r) => fetchItemDetails(r.tmdbId, r.mediaType))
  )

  // Fetch all images (5 posters + avatar) in parallel — avatar was previously sequential
  // after posters which added ~100-300ms of unnecessary latency.
  // Skip custom fonts — remote WOFF/WOFF2 URLs crash satori (TTF-only).
  const [avatarDataUrl, ...top5Posters] = await Promise.all([
    user.image ? toDataUrl(user.image) : Promise.resolve(null),
    ...top5Details.map((d) =>
      d.poster ? toDataUrl(`${TMDB_IMG}/w92${d.poster}`) : Promise.resolve(null)
    ),
  ])

  const items: RankedItem[] = top5.map((r, i) => ({
    rank: i + 1,
    title: top5Details[i].title,
    year: top5Details[i].year,
    posterDataUrl: top5Posters[i],
    score: Math.round(r.displayScore * 10) / 10,
    mediaType: r.mediaType,
  }))

  const isStories = cardType === "stories"
  const W = isStories ? 1080 : 600
  const H = isStories ? 1920 : 600
  const PAD = isStories ? 68 : 36

  const userName = (user.name ?? "Binge User").split(" ").slice(0, 2).join(" ")
  const handle = user.username ? `@${user.username}` : ""

  // Scale factor: stories is ~1.8× preview
  const S = isStories ? 1.8 : 1
  // #1 hero poster is noticeably bigger than the rest — makes it visually unmissable
  const heroPosterW = Math.round(62 * S)
  const heroPosterH = Math.round(93 * S)
  const posterW = Math.round(38 * S)
  const posterH = Math.round(57 * S)
  const heroRowH = Math.round(112 * S)
  const rowH = Math.round(68 * S)
  const rankSize = Math.round(13 * S)
  const heroRankSize = Math.round(22 * S)
  const titleSize = Math.round(13 * S)
  const heroTitleSize = Math.round(15 * S)
  const yearSize = Math.round(10 * S)

  // Amber for #1 (achievement feel), fading white for rest
  const rankColor = (rank: number) => {
    if (rank === 1) return "#F59E0B"
    if (rank === 2) return "rgba(255,255,255,0.50)"
    if (rank === 3) return "rgba(255,255,255,0.38)"
    return "rgba(255,255,255,0.22)"
  }

  try {
  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          background: "linear-gradient(160deg, #04060F 0%, #070B1C 55%, #040609 100%)",
          display: "flex",
          flexDirection: "column",
          padding: PAD,
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient blue glow — bottom left */}
        <div
          style={{
            position: "absolute",
            bottom: isStories ? -220 : -130,
            left: isStories ? -120 : -70,
            width: isStories ? 800 : 440,
            height: isStories ? 800 : 440,
            background: "radial-gradient(circle, rgba(37,99,235,0.22) 0%, rgba(37,99,235,0) 65%)",
            borderRadius: "50%",
          }}
        />
        {/* Amber glow — top right, reinforces #1 gold feeling */}
        <div
          style={{
            position: "absolute",
            top: isStories ? -100 : -60,
            right: isStories ? -100 : -60,
            width: isStories ? 500 : 280,
            height: isStories ? 500 : 280,
            background: "radial-gradient(circle, rgba(245,158,11,0.14) 0%, rgba(245,158,11,0) 65%)",
            borderRadius: "50%",
          }}
        />
        {/* Subtle mid-blue shimmer — center */}
        <div
          style={{
            position: "absolute",
            top: isStories ? 700 : 200,
            right: isStories ? -200 : -100,
            width: isStories ? 600 : 340,
            height: isStories ? 600 : 340,
            background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, rgba(99,102,241,0) 70%)",
            borderRadius: "50%",
          }}
        />

        {/* ── Header: avatar + name + Binge logo ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: isStories ? 52 : 28,
          }}
        >
          {avatarDataUrl ? (
            <img
              src={avatarDataUrl}
              width={isStories ? 72 : 40}
              height={isStories ? 72 : 40}
              style={{
                borderRadius: "50%",
                objectFit: "cover",
                border: `${isStories ? 2.5 : 1.5}px solid rgba(37,99,235,0.5)`,
              }}
            />
          ) : (
            <div
              style={{
                width: isStories ? 72 : 40,
                height: isStories ? 72 : 40,
                borderRadius: "50%",
                background: "rgba(37,99,235,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid rgba(37,99,235,0.3)`,
              }}
            >
              <span style={{ color: "#60a5fa", fontSize: isStories ? 32 : 18, fontWeight: 700 }}>
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: isStories ? 20 : 12,
              gap: 2,
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: isStories ? 30 : 16,
                fontWeight: 700,
                letterSpacing: "-0.3px",
                lineHeight: 1.2,
              }}
            >
              {userName}
            </span>
            {handle ? (
              <span style={{ color: "rgba(255,255,255,0.32)", fontSize: isStories ? 20 : 11 }}>
                {handle}
              </span>
            ) : null}
          </div>

          {/* Binge wordmark — right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: "auto",
              gap: isStories ? 10 : 6,
            }}
          >
            <div
              style={{
                width: isStories ? 34 : 20,
                height: isStories ? 34 : 20,
                background: "#2563EB",
                borderRadius: isStories ? 8 : 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: isStories ? 18 : 11, fontWeight: 900, lineHeight: 1 }}>
                B
              </span>
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: isStories ? 22 : 13,
                fontWeight: 700,
                letterSpacing: "-0.3px",
              }}
            >
              Binge
            </span>
          </div>
        </div>

        {/* ── Section heading ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isStories ? 14 : 8,
            marginBottom: isStories ? 28 : 16,
          }}
        >
          <div
            style={{
              width: isStories ? 4 : 2.5,
              height: isStories ? 30 : 17,
              background: "#2563EB",
              borderRadius: 2,
            }}
          />
          <span
            style={{
              color: "rgba(255,255,255,0.90)",
              fontSize: isStories ? 34 : 19,
              fontWeight: 900,
              letterSpacing: "-0.5px",
            }}
          >
            All-Time Top 5
          </span>
        </div>

        {/* ── Ranked list ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isStories ? 12 : 7,
            flex: 1,
          }}
        >
          {items.map((item) => {
            const isHero = item.rank === 1
            const itemPosterW = isHero ? heroPosterW : posterW
            const itemPosterH = isHero ? heroPosterH : posterH
            const itemRowH = isHero ? heroRowH : rowH
            const itemRankSize = isHero ? heroRankSize : rankSize
            const itemTitleSize = isHero ? heroTitleSize : titleSize
            const itemRankW = isHero ? (isStories ? 56 : 32) : (isStories ? 44 : 24)

            return (
            <div
              key={item.rank}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isStories ? 16 : 9,
                background: isHero
                  ? "linear-gradient(135deg, rgba(245,158,11,0.11) 0%, rgba(245,158,11,0.04) 100%)"
                  : "rgba(255,255,255,0.028)",
                borderRadius: isStories ? 18 : 11,
                padding: isHero
                  ? (isStories ? "16px 20px" : "9px 12px")
                  : (isStories ? "10px 16px" : "6px 9px"),
                border: isHero
                  ? "1px solid rgba(245,158,11,0.24)"
                  : "1px solid rgba(255,255,255,0.05)",
                height: itemRowH,
                boxSizing: "border-box",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Left accent bar — only on #1 */}
              {isHero && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: isStories ? 16 : 9,
                    bottom: isStories ? 16 : 9,
                    width: isStories ? 3 : 2,
                    background: "linear-gradient(180deg, #F59E0B 0%, rgba(245,158,11,0.3) 100%)",
                    borderRadius: 2,
                  }}
                />
              )}

              {/* Rank number */}
              <span
                style={{
                  color: rankColor(item.rank),
                  fontSize: itemRankSize,
                  fontWeight: 900,
                  width: itemRankW,
                  textAlign: "center",
                  lineHeight: 1,
                  letterSpacing: "-0.5px",
                  flexShrink: 0,
                }}
              >
                {item.rank}
              </span>

              {/* Poster thumbnail — #1 gets a bloom glow behind it */}
              <div style={{ position: "relative", flexShrink: 0, display: "flex" }}>
                {isHero && (
                  <div
                    style={{
                      position: "absolute",
                      top: isStories ? -10 : -6,
                      bottom: isStories ? -10 : -6,
                      left: isStories ? -10 : -6,
                      right: isStories ? -10 : -6,
                      background: "radial-gradient(circle, rgba(245,158,11,0.28) 0%, rgba(245,158,11,0) 70%)",
                      borderRadius: "50%",
                    }}
                  />
                )}
                {item.posterDataUrl ? (
                  <img
                    src={item.posterDataUrl}
                    width={itemPosterW}
                    height={itemPosterH}
                    style={{
                      borderRadius: isStories ? 9 : 6,
                      objectFit: "cover",
                      flexShrink: 0,
                      border: isHero
                        ? "1.5px solid rgba(245,158,11,0.40)"
                        : "1px solid rgba(255,255,255,0.06)",
                      position: "relative",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: itemPosterW,
                      height: itemPosterH,
                      background: isHero ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.05)",
                      borderRadius: isStories ? 9 : 6,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>

              {/* Title + year */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  gap: isStories ? 5 : 3,
                  overflow: "hidden",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    color: isHero ? "#ffffff" : "rgba(255,255,255,0.80)",
                    fontSize: itemTitleSize,
                    fontWeight: isHero ? 900 : 600,
                    lineHeight: 1.2,
                    letterSpacing: isHero ? "-0.5px" : "-0.2px",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.title}
                </span>
                <span style={{ color: isHero ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.24)", fontSize: yearSize }}>
                  {item.year}{item.mediaType === "tv" ? "  ·  TV" : ""}
                </span>
              </div>

              {/* Score pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: isHero ? (isStories ? 60 : 36) : (isStories ? 48 : 28),
                  height: isHero ? (isStories ? 60 : 36) : (isStories ? 48 : 28),
                  borderRadius: "50%",
                  background: isHero
                    ? "rgba(245,158,11,0.14)"
                    : "rgba(37,99,235,0.09)",
                  border: isHero
                    ? "1.5px solid rgba(245,158,11,0.35)"
                    : "1px solid rgba(37,99,235,0.20)",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: isHero ? "#F59E0B" : "#60a5fa",
                    fontSize: isHero ? (isStories ? 20 : 12) : (isStories ? 17 : 10),
                    fontWeight: 800,
                    lineHeight: 1,
                  }}
                >
                  {item.score.toFixed(1)}
                </span>
              </div>
            </div>
            )
          })}
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: isStories ? 40 : 18,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.12)",
              fontSize: isStories ? 18 : 10,
              letterSpacing: "0.8px",
            }}
          >
            binge.app  ·  rank what you love
          </span>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        "Cache-Control": "public, max-age=600, stale-while-revalidate=300",
        "Content-Disposition": `inline; filename="binge-top5.png"`,
      },
    }
  )
  } catch (err) {
    console.error("[share/card] ImageResponse render failed:", err)
    return new Response(
      JSON.stringify({ error: "render_failed", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
