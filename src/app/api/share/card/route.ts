// GET /api/share/card?userId=<id>&type=<stories|preview>
// Returns a PNG image of the user's Top 5 ranked movies + TV shows.
// type=stories → 1080×1920 (Instagram Stories / full portrait)
// type=preview → 600×600 (iMessage / Twitter square)
//
// Satori renders JSX → SVG, @resvg/resvg-js converts SVG → PNG.
// All rendering is server-side — no browser needed.

import { type NextRequest, NextResponse } from "next/server"
import satori from "satori"
import { Resvg } from "@resvg/resvg-js"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { normalizeEloScores } from "@/lib/elo"
import { getMovieDetails, getTVDetails } from "@/lib/tmdb"

const TMDB_IMG = "https://image.tmdb.org/t/p"

// ── Types ──────────────────────────────────────────────────────────────────────
interface RankedItem {
  rank: number
  title: string
  year: string
  posterUrl: string | null
  score: number
  mediaType: string
}

interface UserInfo {
  name: string
  username: string | null
  avatarUrl: string | null
}

// ── TMDB helpers ───────────────────────────────────────────────────────────────
async function fetchItemDetails(
  tmdbId: number,
  mediaType: string
): Promise<{ title: string; year: string; poster: string | null }> {
  try {
    const d = mediaType === "tv"
      ? await getTVDetails(tmdbId)
      : await getMovieDetails(tmdbId)
    const raw = d as unknown as Record<string, unknown>
    const title = (raw.title ?? raw.name ?? String(tmdbId)) as string
    const dateStr = (raw.release_date ?? raw.first_air_date ?? "") as string
    const year = dateStr ? dateStr.slice(0, 4) : ""
    const poster = (raw.poster_path as string | null) ?? null
    return { title, year, poster }
  } catch {
    return { title: String(tmdbId), year: "", poster: null }
  }
}

// ── Font loading ───────────────────────────────────────────────────────────────
// We fetch Inter from Google Fonts as ArrayBuffer — satori requires binary font data.
const fontCache: Record<string, ArrayBuffer> = {}

async function getFont(weight: 400 | 600 | 700 | 800): Promise<ArrayBuffer> {
  if (fontCache[weight]) return fontCache[weight]
  const res = await fetch(
    `https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff`,
    { next: { revalidate: 86400 } }
  )
  const buf = await res.arrayBuffer()
  fontCache[weight] = buf
  return buf
}

// ── Helper: fetch poster as base64 data URL ────────────────────────────────────
// Satori cannot load external images via URL in many environments,
// so we proxy poster images through base64 embedding.
async function posterToDataUrl(posterPath: string | null): Promise<string | null> {
  if (!posterPath) return null
  try {
    const url = `${TMDB_IMG}/w342${posterPath}`
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

async function avatarToDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null
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

// ── Card JSX (satori "React-like" object syntax) ──────────────────────────────
// Satori does NOT support all CSS — only a subset (flex, basic box model, text).
// No grid, no overflow:hidden on images without explicit dimensions.

function buildCardJsx(
  user: UserInfo,
  movies: RankedItem[],
  tv: RankedItem[],
  width: number,
  height: number,
  avatarDataUrl: string | null
) {
  const isStories = height > 900
  const pad = isStories ? 60 : 32
  const posterW = isStories ? 100 : 56
  const posterH = isStories ? 150 : 84
  const titleSize = isStories ? 28 : 16
  const subtitleSize = isStories ? 22 : 12
  const rankSize = isStories ? 48 : 26
  const itemGap = isStories ? 24 : 12

  // Build ranked items list (movies first, then TV — max 5 each visible)
  const allItems = [...movies.slice(0, 5), ...tv.slice(0, 5)]

  return {
    type: "div",
    props: {
      style: {
        width,
        height,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        padding: `${pad}px`,
        fontFamily: "Inter",
        position: "relative",
      },
      children: [
        // ── Header: avatar + name + @username ──────────────────
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: isStories ? 24 : 14,
              marginBottom: isStories ? 48 : 24,
            },
            children: [
              // Avatar
              avatarDataUrl
                ? {
                    type: "img",
                    props: {
                      src: avatarDataUrl,
                      width: isStories ? 80 : 44,
                      height: isStories ? 80 : 44,
                      style: {
                        borderRadius: "50%",
                        objectFit: "cover",
                        border: "2px solid rgba(37,99,235,0.6)",
                      },
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: {
                        width: isStories ? 80 : 44,
                        height: isStories ? 80 : 44,
                        borderRadius: "50%",
                        background: "#1d2d4f",
                        border: "2px solid rgba(37,99,235,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      children: [
                        {
                          type: "span",
                          props: {
                            style: {
                              color: "#60a5fa",
                              fontSize: isStories ? 36 : 20,
                              fontWeight: 700,
                            },
                            children: user.name.charAt(0).toUpperCase(),
                          },
                        },
                      ],
                    },
                  },
              // Name + handle
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: 4 },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          color: "#ffffff",
                          fontSize: isStories ? 32 : 18,
                          fontWeight: 700,
                          lineHeight: 1.2,
                        },
                        children: user.name,
                      },
                    },
                    user.username
                      ? {
                          type: "span",
                          props: {
                            style: {
                              color: "rgba(255,255,255,0.4)",
                              fontSize: isStories ? 22 : 13,
                              fontWeight: 400,
                            },
                            children: `@${user.username}`,
                          },
                        }
                      : { type: "span", props: { children: "" } },
                  ],
                },
              },
              // Binge logo (right-aligned)
              {
                type: "div",
                props: {
                  style: {
                    marginLeft: "auto",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          width: isStories ? 36 : 22,
                          height: isStories ? 36 : 22,
                          background: "#2563EB",
                          borderRadius: isStories ? 8 : 5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        },
                        children: [
                          {
                            type: "span",
                            props: {
                              style: {
                                color: "#fff",
                                fontSize: isStories ? 18 : 11,
                                fontWeight: 800,
                              },
                              children: "B",
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          color: "rgba(255,255,255,0.6)",
                          fontSize: isStories ? 24 : 14,
                          fontWeight: 700,
                        },
                        children: "Binge",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // ── Section title ────────────────────────────────────────
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: isStories ? 32 : 16,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    width: isStories ? 4 : 3,
                    height: isStories ? 32 : 18,
                    background: "#2563EB",
                    borderRadius: 2,
                  },
                },
              },
              {
                type: "span",
                props: {
                  style: {
                    color: "#ffffff",
                    fontSize: isStories ? 36 : 20,
                    fontWeight: 800,
                    letterSpacing: "-0.5px",
                  },
                  children: "My All-Time Top 5",
                },
              },
            ],
          },
        },

        // ── Movies section ───────────────────────────────────────
        movies.length > 0
          ? buildSection("🎬 Movies", movies.slice(0, 5), isStories, posterW, posterH, titleSize, subtitleSize, rankSize, itemGap)
          : { type: "span", props: { children: "" } },

        // Spacer between sections
        movies.length > 0 && tv.length > 0
          ? {
              type: "div",
              props: {
                style: { height: isStories ? 40 : 20 },
              },
            }
          : { type: "span", props: { children: "" } },

        // ── TV section ───────────────────────────────────────────
        tv.length > 0
          ? buildSection("📺 TV Shows", tv.slice(0, 5), isStories, posterW, posterH, titleSize, subtitleSize, rankSize, itemGap)
          : { type: "span", props: { children: "" } },

        // ── Footer ───────────────────────────────────────────────
        {
          type: "div",
          props: {
            style: {
              marginTop: "auto",
              display: "flex",
              justifyContent: "center",
              paddingTop: isStories ? 40 : 20,
            },
            children: [
              {
                type: "span",
                props: {
                  style: {
                    color: "rgba(255,255,255,0.2)",
                    fontSize: isStories ? 20 : 11,
                    fontWeight: 400,
                  },
                  children: "binge.app · Rank what you watch",
                },
              },
            ],
          },
        },
      ],
    },
  }
}

function buildSection(
  sectionTitle: string,
  items: RankedItem[],
  isStories: boolean,
  posterW: number,
  posterH: number,
  titleSize: number,
  subtitleSize: number,
  rankSize: number,
  itemGap: number
) {
  return {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", gap: itemGap },
      children: [
        // Section label
        {
          type: "span",
          props: {
            style: {
              color: "rgba(255,255,255,0.35)",
              fontSize: isStories ? 20 : 11,
              fontWeight: 600,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              marginBottom: isStories ? 8 : 4,
            },
            children: sectionTitle,
          },
        },
        // Items
        ...items.map((item) => ({
          type: "div",
          props: {
            key: `${item.mediaType}-${item.rank}`,
            style: {
              display: "flex",
              alignItems: "center",
              gap: isStories ? 20 : 12,
              background: "rgba(255,255,255,0.04)",
              borderRadius: isStories ? 16 : 10,
              padding: isStories ? "16px 20px" : "8px 12px",
              border: "1px solid rgba(255,255,255,0.07)",
            },
            children: [
              // Rank number
              {
                type: "span",
                props: {
                  style: {
                    color: item.rank === 1 ? "#2563EB" : "rgba(255,255,255,0.25)",
                    fontSize: rankSize,
                    fontWeight: 800,
                    width: isStories ? 48 : 28,
                    textAlign: "center",
                    flexShrink: 0,
                    lineHeight: 1,
                  },
                  children: String(item.rank),
                },
              },
              // Poster
              item.posterUrl
                ? {
                    type: "img",
                    props: {
                      src: item.posterUrl,
                      width: posterW,
                      height: posterH,
                      style: {
                        borderRadius: isStories ? 8 : 4,
                        objectFit: "cover",
                        flexShrink: 0,
                      },
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: {
                        width: posterW,
                        height: posterH,
                        background: "#1a1a2e",
                        borderRadius: isStories ? 8 : 4,
                        flexShrink: 0,
                      },
                    },
                  },
              // Title + year + score
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    gap: isStories ? 8 : 4,
                    flex: 1,
                    minWidth: 0,
                  },
                  children: [
                    {
                      type: "span",
                      props: {
                        style: {
                          color: "#ffffff",
                          fontSize: titleSize,
                          fontWeight: 700,
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                        children: item.title,
                      },
                    },
                    {
                      type: "span",
                      props: {
                        style: {
                          color: "rgba(255,255,255,0.4)",
                          fontSize: subtitleSize,
                          fontWeight: 400,
                        },
                        children: item.year,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: isStories ? 4 : 2,
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                width: isStories ? Math.round(item.score * 1.4) : Math.round(item.score * 0.7),
                                height: isStories ? 4 : 3,
                                background: "#2563EB",
                                borderRadius: 2,
                              },
                            },
                          },
                          {
                            type: "span",
                            props: {
                              style: {
                                color: "#60a5fa",
                                fontSize: subtitleSize,
                                fontWeight: 600,
                              },
                              children: `${item.score}`,
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        })),
      ],
    },
  }
}

// ── Route handler ──────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const requestedUserId = searchParams.get("userId")
  const cardType = searchParams.get("type") ?? "preview" // "stories" | "preview"

  // Auth: either requesting own card (no userId) or a public profile card
  const session = await auth()
  const userId = requestedUserId ?? session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // ── Fetch user ─────────────────────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true, image: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // ── Fetch ratings ──────────────────────────────────────────────────────────
  const allRatings = await prisma.rating.findMany({ where: { userId } })

  const movieRatings = normalizeEloScores(
    allRatings.filter((r) => r.mediaType !== "tv")
  ).sort((a, b) => b.displayScore - a.displayScore)

  const tvRatings = normalizeEloScores(
    allRatings.filter((r) => r.mediaType === "tv")
  ).sort((a, b) => b.displayScore - a.displayScore)

  const top5Movies = movieRatings.slice(0, 5)
  const top5TV = tvRatings.slice(0, 5)

  // ── Fetch TMDB details in parallel ────────────────────────────────────────
  const [movieDetails, tvDetails] = await Promise.all([
    Promise.all(top5Movies.map((r) => fetchItemDetails(r.tmdbId, r.mediaType))),
    Promise.all(top5TV.map((r) => fetchItemDetails(r.tmdbId, "tv"))),
  ])

  // ── Fetch poster images as base64 ─────────────────────────────────────────
  const [moviePosters, tvPosters, avatarDataUrl] = await Promise.all([
    Promise.all(movieDetails.map((d) => posterToDataUrl(d.poster))),
    Promise.all(tvDetails.map((d) => posterToDataUrl(d.poster))),
    avatarToDataUrl(user.image),
  ])

  // ── Build ranked item arrays ───────────────────────────────────────────────
  const movies: RankedItem[] = top5Movies.map((r, i) => ({
    rank: i + 1,
    title: movieDetails[i].title,
    year: movieDetails[i].year,
    posterUrl: moviePosters[i],
    score: Math.round(r.displayScore),
    mediaType: "movie",
  }))

  const tv: RankedItem[] = top5TV.map((r, i) => ({
    rank: i + 1,
    title: tvDetails[i].title,
    year: tvDetails[i].year,
    posterUrl: tvPosters[i],
    score: Math.round(r.displayScore),
    mediaType: "tv",
  }))

  const userInfo: UserInfo = {
    name: user.name ?? "Binge User",
    username: user.username,
    avatarUrl: user.image,
  }

  // ── Card dimensions ────────────────────────────────────────────────────────
  const isStories = cardType === "stories"
  const width = isStories ? 1080 : 600
  const height = isStories ? 1920 : 600

  // ── Load fonts ─────────────────────────────────────────────────────────────
  const fontRegular = await getFont(400)
  const fontBold = await getFont(700)

  // ── Render with satori ─────────────────────────────────────────────────────
  const svg = await satori(
    buildCardJsx(userInfo, movies, tv, width, height, avatarDataUrl) as Parameters<typeof satori>[0],
    {
      width,
      height,
      fonts: [
        { name: "Inter", data: fontRegular, weight: 400, style: "normal" },
        { name: "Inter", data: fontBold, weight: 700, style: "normal" },
      ],
    }
  )

  // ── Convert SVG → PNG ──────────────────────────────────────────────────────
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } })
  const pngData = resvg.render()
  const png = pngData.asPng()

  return new Response(png.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      "Content-Disposition": `inline; filename="binge-top5.png"`,
    },
  })
}
