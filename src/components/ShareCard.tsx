/**
 * ShareCard.tsx
 * Satori-compatible React component for generating shareable PNG cards.
 * Rules:
 *  - ALL styles must be inline (no className, no Tailwind)
 *  - Flexbox only (no CSS grid)
 *  - No backdrop-filter, no CSS variables, no box-shadow blur
 *  - Images must be absolute URLs (pass full TMDB poster URLs from API route)
 *  - Used by /api/share/card route via @vercel/og or satori
 */

export interface ShareCardItem {
  rank: number
  title: string
  posterUrl: string | null
  score: number
  /** Solid CSS color for the score badge background (e.g. "#d97706") */
  tierBg: string
  /** CSS color for the score badge text (e.g. "#000000") */
  tierText: string
}

export interface ShareCardProps {
  userName: string
  userImage?: string | null
  /** Up to 5 items — combined top movies + TV, sorted by score desc */
  items: ShareCardItem[]
  /** "square" = 1080×1080 (default) | "stories" = 1080×1920 */
  variant?: "square" | "stories"
}

// ── Tier color map (same palette as tiers.ts but resolved to hex for satori) ──
export function getTierColors(score: number): { bg: string; text: string } {
  if (score >= 9.0) return { bg: "#d97706", text: "#000000" }  // amber — All-Time
  if (score >= 8.0) return { bg: "#2563eb", text: "#ffffff" }  // blue — Loved It
  if (score >= 7.0) return { bg: "#4338ca", text: "#ffffff" }  // indigo — Really Good
  if (score >= 6.0) return { bg: "#059669", text: "#ffffff" }  // emerald — Good
  if (score >= 5.0) return { bg: "#52525b", text: "#ffffff" }  // zinc — Mid
  return { bg: "#9f1239", text: "#ffffff" }                    // rose — Didn't Like
}

export default function ShareCard({
  userName,
  userImage,
  items,
  variant = "square",
}: ShareCardProps) {
  const width = 1080
  const height = variant === "stories" ? 1920 : 1080
  const top5 = items.slice(0, 5)

  if (variant === "stories") {
    return <StoriesCard width={width} height={height} userName={userName} userImage={userImage} items={top5} />
  }

  return <SquareCard width={width} height={height} userName={userName} userImage={userImage} items={top5} />
}

// ─────────────────────────────────────────────────────────────────
// Square card: 1080×1080 — horizontal poster row
// ─────────────────────────────────────────────────────────────────
function SquareCard({
  width,
  height,
  userName,
  userImage,
  items,
}: {
  width: number
  height: number
  userName: string
  userImage?: string | null
  items: ShareCardItem[]
}) {
  const pad = 72
  const posterW = Math.floor((width - pad * 2 - 20 * 4) / 5)
  const posterH = Math.floor(posterW * 1.5)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        background: "#000000",
        position: "relative",
        fontFamily: '"Inter", "SF Pro Display", ui-sans-serif, system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      {/* Top blue gradient wash */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 520,
          background: "linear-gradient(180deg, rgba(37,99,235,0.28) 0%, rgba(17,54,163,0.10) 55%, rgba(0,0,0,0) 100%)",
          display: "flex",
        }}
      />

      {/* Subtle center vignette */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 320,
          background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
          display: "flex",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: `${pad}px ${pad}px 56px ${pad}px`,
          flex: 1,
          position: "relative",
        }}
      >
        {/* Header row: logo + "binge.app" */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 64,
          }}
        >
          {/* Binge logo mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                background: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: 26,
                  fontWeight: 800,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                b
              </span>
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: -1,
              }}
            >
              binge
            </span>
          </div>

          <span
            style={{
              color: "rgba(255,255,255,0.2)",
              fontSize: 20,
              letterSpacing: 0.5,
            }}
          >
            binge.app
          </span>
        </div>

        {/* User info block */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 56,
          }}
        >
          {userImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={userImage}
              width={68}
              height={68}
              alt=""
              style={{ borderRadius: 34, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                background: "rgba(37,99,235,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#60a5fa", fontSize: 30, fontWeight: 800 }}>
                {userName[0]?.toUpperCase() ?? "?"}
              </span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                color: "#ffffff",
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: -0.5,
              }}
            >
              {userName}
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.55)",
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              Top 5 of all time
            </span>
          </div>
        </div>

        {/* Poster row */}
        <div
          style={{
            display: "flex",
            gap: 20,
            flex: 1,
            alignItems: "flex-start",
          }}
        >
          {items.map((item, i) => (
            <PosterCard
              key={i}
              item={item}
              index={i}
              posterW={posterW}
              posterH={posterH}
            />
          ))}

          {/* Fill empty slots */}
          {Array.from({ length: Math.max(0, 5 - items.length) }).map((_, i) => (
            <EmptyPosterSlot key={`empty-${i}`} rank={items.length + i + 1} posterW={posterW} posterH={posterH} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Stories card: 1080×1920 — vertical stacked layout
// ─────────────────────────────────────────────────────────────────
function StoriesCard({
  width,
  height,
  userName,
  userImage,
  items,
}: {
  width: number
  height: number
  userName: string
  userImage?: string | null
  items: ShareCardItem[]
}) {
  const pad = 72
  const posterW = Math.floor((width - pad * 2 - 24) / 2)
  const posterH = Math.floor(posterW * 1.5)
  const topItem = items[0]
  const restItems = items.slice(1, 5)

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width,
        height,
        background: "#000000",
        position: "relative",
        fontFamily: '"Inter", "SF Pro Display", ui-sans-serif, system-ui, sans-serif',
        overflow: "hidden",
      }}
    >
      {/* Top blue gradient */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 700,
          background: "linear-gradient(180deg, rgba(37,99,235,0.30) 0%, rgba(17,54,163,0.12) 50%, rgba(0,0,0,0) 100%)",
          display: "flex",
        }}
      />

      {/* Bottom vignette */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 300,
          background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)",
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: `${pad}px ${pad}px 80px`,
          flex: 1,
          position: "relative",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 80 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#ffffff", fontSize: 28, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>b</span>
          </div>
          <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 32, fontWeight: 700, letterSpacing: -1 }}>binge</span>
        </div>

        {/* User info */}
        <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 64 }}>
          {userImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={userImage} width={72} height={72} alt="" style={{ borderRadius: 36, objectFit: "cover" }} />
          ) : (
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                background: "rgba(37,99,235,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#60a5fa", fontSize: 32, fontWeight: 800 }}>{userName[0]?.toUpperCase() ?? "?"}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ color: "#ffffff", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>{userName}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 22, letterSpacing: 3, textTransform: "uppercase" }}>
              Top 5 of all time
            </span>
          </div>
        </div>

        {/* #1 pick — large hero poster */}
        {topItem && (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
            <div
              style={{
                position: "relative",
                width: width - pad * 2,
                height: Math.floor((width - pad * 2) * 1.1),
                borderRadius: 20,
                overflow: "hidden",
                display: "flex",
              }}
            >
              {topItem.posterUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={topItem.posterUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ background: "rgba(255,255,255,0.05)", width: "100%", height: "100%" }} />
              )}
              {/* Dark gradient overlay */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "50%",
                  background: "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "0 28px 24px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
                    #1
                  </span>
                  <span style={{ color: "#ffffff", fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>
                    {topItem.title}
                  </span>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    background: topItem.tierBg,
                    borderRadius: 12,
                    padding: "8px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: topItem.tierText, fontSize: 28, fontWeight: 900 }}>
                    {topItem.score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2×2 grid for #2–#5 */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          {restItems.map((item, i) => (
            <PosterCard
              key={i}
              item={item}
              index={i + 1}
              posterW={posterW}
              posterH={posterH}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "auto", paddingTop: 48 }}>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 22, letterSpacing: 1 }}>binge.app</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────

function PosterCard({
  item,
  index,
  posterW,
  posterH,
}: {
  item: ShareCardItem
  index: number
  posterW: number
  posterH: number
}) {
  // #1 gets slightly more emphasis — larger rank badge
  const isTop = index === 0

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: posterW,
        gap: 12,
      }}
    >
      {/* Poster */}
      <div
        style={{
          position: "relative",
          width: posterW,
          height: posterH,
          borderRadius: 14,
          overflow: "hidden",
          display: "flex",
        }}
      >
        {item.posterUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.posterUrl}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        )}

        {/* Rank badge — top-left */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(0,0,0,0.72)",
            borderRadius: 8,
            padding: isTop ? "4px 12px" : "3px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: isTop ? 18 : 15,
              fontWeight: 800,
            }}
          >
            #{item.rank}
          </span>
        </div>

        {/* Score badge — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            background: item.tierBg,
            borderRadius: 8,
            padding: "4px 10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              color: item.tierText,
              fontSize: isTop ? 22 : 18,
              fontWeight: 900,
            }}
          >
            {item.score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Title */}
      <div
        style={{
          display: "flex",
          width: posterW,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 16,
            fontWeight: 600,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: posterW,
          }}
        >
          {item.title}
        </span>
      </div>
    </div>
  )
}

function EmptyPosterSlot({
  rank,
  posterW,
  posterH,
}: {
  rank: number
  posterW: number
  posterH: number
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", width: posterW, gap: 12 }}>
      <div
        style={{
          width: posterW,
          height: posterH,
          borderRadius: 14,
          background: "rgba(255,255,255,0.03)",
          border: "2px dashed rgba(255,255,255,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 28, fontWeight: 800 }}>#{rank}</span>
      </div>
      <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 16, textAlign: "center" }}>—</span>
    </div>
  )
}

