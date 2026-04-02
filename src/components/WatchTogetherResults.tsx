"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Film, AlertTriangle, RefreshCw, X, Users } from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────

interface WatchTogetherResult {
  tmdbId: number
  mediaType: "movie" | "tv"
  title: string
  year: string
  posterPath: string | null
  score: number
  reason: "overlap" | "fallback_popular"
  partiallyUnseen?: boolean
}

interface WatchTogetherWarning {
  userId: string
  reason: string
  name: string
}

interface WatchTogetherResponse {
  results: WatchTogetherResult[]
  warnings: WatchTogetherWarning[]
}

interface FriendMeta {
  id: string
  name: string | null
  image: string | null
}

interface WatchTogetherResultsProps {
  friendIds: string[]
  friends: FriendMeta[]
}

// ── Sub-components ──────────────────────────────────────────────────────────

function AvatarBubble({
  image,
  name,
  size = 36,
  index = 0,
}: {
  image: string | null
  name: string | null
  size?: number
  index?: number
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? "Friend"}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-black"
        style={{ width: size, height: size, marginLeft: index > 0 ? -10 : 0, zIndex: 10 - index }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-blue-500/25 flex items-center justify-center ring-2 ring-black flex-shrink-0"
      style={{ width: size, height: size, marginLeft: index > 0 ? -10 : 0, zIndex: 10 - index }}
    >
      <span className="font-bold text-blue-300" style={{ fontSize: size * 0.38 }}>
        {(name ?? "?")[0].toUpperCase()}
      </span>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3 animate-pulse">
      <div className="h-[72px] w-12 flex-shrink-0 rounded-md bg-white/[0.08]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-white/[0.08]" />
        <div className="h-2.5 w-1/3 rounded bg-white/5" />
      </div>
      <div className="h-8 w-12 flex-shrink-0 rounded-full bg-white/5" />
    </div>
  )
}

function ScorePill({ score, reason }: { score: number; reason: string }) {
  const isFallback = reason === "fallback_popular"
  const color =
    score >= 8
      ? "bg-blue-500/20 text-blue-300"
      : score >= 6.5
      ? "bg-emerald-500/15 text-emerald-400"
      : score >= 5
      ? "bg-amber-500/15 text-amber-400"
      : "bg-white/5 text-white/40"
  return (
    <div className={`flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-2.5 py-1.5 min-w-[44px] ${color}`}>
      <span className="text-xs font-black tabular-nums leading-none">{score.toFixed(1)}</span>
      {isFallback && (
        <span className="mt-0.5 text-[9px] leading-none text-current opacity-60">pop</span>
      )}
    </div>
  )
}

const POSTER_BASE = "https://image.tmdb.org/t/p/w154"

// ── Main component ──────────────────────────────────────────────────────────

type FilterType = "all" | "movie" | "tv"
type FetchState = "idle" | "loading" | "success" | "error"

export default function WatchTogetherResults({ friendIds, friends }: WatchTogetherResultsProps) {
  const router = useRouter()

  const [fetchState, setFetchState] = useState<FetchState>("loading")
  const [data, setData] = useState<WatchTogetherResponse | null>(null)
  const [filter, setFilter] = useState<FilterType>("all")
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set())
  const [fallbackNoteDismissed, setFallbackNoteDismissed] = useState(false)

  // Stable string — avoids array reference churn in useCallback dependency
  const friendIdsParam = friendIds.join(",")

  const load = useCallback(async () => {
    setFetchState("loading")
    try {
      const res = await fetch(`/api/watch-together?friendIds=${friendIdsParam}`)
      if (!res.ok) throw new Error("fetch_failed")
      const json: WatchTogetherResponse = await res.json()
      setData(json)
      setFetchState("success")
    } catch {
      setFetchState("error")
    }
  }, [friendIdsParam])

  useEffect(() => {
    load()
  }, [load])

  const allResults = data?.results ?? []
  const filtered =
    filter === "all" ? allResults : allResults.filter((r) => r.mediaType === filter)

  const hasFallback = allResults.some((r) => r.reason === "fallback_popular")
  const warnings = (data?.warnings ?? []).filter((w) => !dismissedWarnings.has(w.userId))

  const friendNames = friends.map((f) => f.name ?? "Friend")
  const subtitle =
    friendNames.length === 1
      ? `You + ${friendNames[0]}`
      : friendNames.length === 2
      ? `You, ${friendNames[0]} & ${friendNames[1]}`
      : `You + ${friendNames.length} friends`

  return (
    // h-dvh app-shell: header + filter bar = flex-shrink-0, content = flex-1 min-h-0 overflow-y-auto
    <div className="flex h-dvh flex-col overflow-hidden bg-black">

      {/* ── Header ── */}
      <header
        className="flex-shrink-0 border-b border-white/[0.06] bg-black px-4 py-3"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white/60 hover:bg-white/[0.08] hover:text-white active:scale-95 transition-all duration-150"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* AvatarStack */}
          <div className="flex items-center flex-shrink-0">
            {friends.slice(0, 5).map((f, i) => (
              <AvatarBubble key={f.id} image={f.image} name={f.name} size={32} index={i} />
            ))}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black tracking-tight">Watch Together</h1>
            <p className="truncate text-[11px] text-white/40">{subtitle}</p>
          </div>
        </div>
      </header>

      {/* ── Filter pills ── */}
      <div className="flex-shrink-0 flex items-center gap-2 border-b border-white/[0.06] bg-black/95 px-4 py-2.5">
        {(["all", "movie", "tv"] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-150 min-h-[32px]",
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white",
            ].join(" ")}
          >
            {f === "all" ? "All" : f === "movie" ? "Movies" : "TV"}
          </button>
        ))}
        {fetchState === "success" && allResults.length > 0 && (
          <span className="ml-auto text-[11px] text-white/30 tabular-nums">
            {filtered.length} title{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* ── Scrollable content — min-h-0 is critical ── */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
        style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }}
      >
        {/* Loading skeletons */}
        {fetchState === "loading" && (
          <div className="space-y-2 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Error / retry */}
        {fetchState === "error" && (
          <div className="flex flex-col items-center gap-5 py-24 text-center">
            <RefreshCw className="h-8 w-8 text-white/20" />
            <div>
              <p className="text-sm font-semibold text-white/60">Something went wrong</p>
              <p className="mt-0.5 text-xs text-white/30">Tap to try again</p>
            </div>
            <button
              onClick={load}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-white/[0.08] px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        {/* Success */}
        {fetchState === "success" && (
          <>
            {/* Partial-data warning banners */}
            {warnings.map((w) => (
              <div
                key={w.userId}
                className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-3.5 py-3"
              >
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400 mt-0.5" />
                <p className="flex-1 text-xs text-amber-200/80 leading-relaxed">
                  <span className="font-semibold">{w.name}</span> hasn&apos;t ranked enough yet
                  {w.reason === "not_enough_ratings"
                    ? " — results based on the rest of your group"
                    : ""}
                </p>
                <button
                  onClick={() =>
                    setDismissedWarnings((prev) => new Set([...prev, w.userId]))
                  }
                  className="flex-shrink-0 p-0.5 text-amber-400/60 hover:text-amber-400 transition-colors"
                  aria-label="Dismiss warning"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Fallback note */}
            {hasFallback && !fallbackNoteDismissed && (
              <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3">
                <Film className="h-4 w-4 flex-shrink-0 text-white/30 mt-0.5" />
                <p className="flex-1 text-xs text-white/45 leading-relaxed">
                  Based on each person&apos;s top picks — limited overlap found
                </p>
                <button
                  onClick={() => setFallbackNoteDismissed(true)}
                  className="flex-shrink-0 p-0.5 text-white/30 hover:text-white/60 transition-colors"
                  aria-label="Dismiss note"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Results list */}
            {filtered.length > 0 ? (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <Link
                    key={`${item.tmdbId}-${item.mediaType}`}
                    href={`/movie/${item.tmdbId}?type=${item.mediaType}`}
                    className="group flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-3 hover:bg-white/[0.07] active:bg-white/[0.09] transition-colors duration-150"
                  >
                    {/* Poster */}
                    <div className="relative h-[72px] w-12 flex-shrink-0 overflow-hidden rounded-md bg-zinc-900">
                      {item.posterPath ? (
                        <Image
                          src={`${POSTER_BASE}${item.posterPath}`}
                          alt={item.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-white/5">
                          <Film className="h-5 w-5 text-white/15" />
                        </div>
                      )}
                    </div>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-white/35">{item.year}</span>
                        <span className="text-white/15">·</span>
                        <span className="rounded bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
                          {item.mediaType === "tv" ? "TV" : "Film"}
                        </span>
                        {item.partiallyUnseen && (
                          <>
                            <span className="text-white/15">·</span>
                            <span className="text-[10px] text-amber-400/60">Partially unseen</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score */}
                    <ScorePill score={item.score} reason={item.reason} />
                  </Link>
                ))}
              </div>
            ) : allResults.length > 0 ? (
              // Has results but current filter matches none
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Film className="h-8 w-8 text-white/15" />
                <p className="text-sm text-white/40">
                  No {filter === "movie" ? "movies" : "TV shows"} in these results
                </p>
                <button
                  onClick={() => setFilter("all")}
                  className="min-h-[44px] rounded-xl bg-white/[0.08] px-4 py-2 text-xs font-semibold text-white/60 hover:text-white transition-colors"
                >
                  Show all
                </button>
              </div>
            ) : (
              // Truly empty
              <div className="flex flex-col items-center gap-5 py-24 text-center px-6">
                <Users className="h-10 w-10 text-white/15" />
                <div>
                  <p className="text-base font-bold text-white/70">Not enough overlap yet</p>
                  <p className="mt-2 text-sm text-white/35 leading-relaxed max-w-xs mx-auto">
                    Your circle needs more rankings to find great matches. The more everyone
                    ranks, the better this gets.
                  </p>
                </div>
                <Link
                  href="/recommendations"
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all"
                >
                  Rate something
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
