"use client"

import { useState, useEffect } from "react"
import type { TasteData } from "@/app/api/taste/route"

// ── Score → bar fill color (Tailwind classes that appear in tiers.ts — JIT-safe) ──
function scoreToBg(score: number): string {
  if (score >= 9.0) return "bg-amber-500"
  if (score >= 8.0) return "bg-blue-500"
  if (score >= 7.0) return "bg-indigo-500"
  if (score >= 6.0) return "bg-emerald-500"
  if (score >= 5.0) return "bg-zinc-500"
  return "bg-rose-700"
}

function mediaLabel(type: string): string {
  if (type === "tv") return "TV Shows"
  if (type === "documentary") return "Docs"
  return "Movies"
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-4 w-32 rounded-full bg-white/[0.06]" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.1 }}>
            <div className="h-3 w-24 rounded-full bg-white/[0.06]" />
            <div className="h-2 flex-1 rounded-full bg-white/[0.04]" />
            <div className="h-3 w-8 rounded-full bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3" style={{ opacity: 1 - i * 0.12 }}>
            <div className="h-3 w-16 rounded-full bg-white/[0.06]" />
            <div className="h-2 flex-1 rounded-full bg-white/[0.04]" />
            <div className="h-3 w-8 rounded-full bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizontal bar row ────────────────────────────────────────────────────────
function BarRow({
  label,
  score,
  count,
  maxCount,
  scoreColor,
}: {
  label: string
  score: number
  count: number
  maxCount: number
  scoreColor: string
}) {
  const barPct = (score / 10) * 100
  const countPct = maxCount > 0 ? (count / maxCount) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <span className="w-28 flex-shrink-0 truncate text-[12px] font-medium text-white/70">
        {label}
      </span>

      {/* Bar track */}
      <div className="relative flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        {/* Count fill (faint background) */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-white/[0.06]"
          style={{ width: `${countPct}%` }}
        />
        {/* Score fill (bright) */}
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${scoreToBg(score)}`}
          style={{ width: `${barPct}%`, opacity: 0.75 }}
        />
      </div>

      {/* Score */}
      <span className={`w-8 flex-shrink-0 text-right text-[12px] font-black tabular-nums ${scoreColor}`}>
        {score.toFixed(1)}
      </span>

      {/* Count */}
      <span className="w-10 flex-shrink-0 text-right text-[11px] text-white/25 tabular-nums">
        ×{count}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TasteTab({ userId }: { userId: string }) {
  const [data, setData] = useState<TasteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    fetch(`/api/taste?userId=${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json() as Promise<TasteData>
      })
      .then((d) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [userId])

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-white/40">Couldn&apos;t load taste profile</p>
        <button
          onClick={() => { setError(false); setLoading(true) }}
          className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data || data.totalRated === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-white/40">No rankings yet</p>
        <p className="text-xs text-white/25">Start ranking to build your taste profile</p>
      </div>
    )
  }

  if (data.genres.length === 0 && data.eras.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm text-white/40">Not enough data yet</p>
        <p className="text-xs text-white/25">Rank a few more titles to unlock your taste profile</p>
      </div>
    )
  }

  const maxGenreCount = Math.max(...data.genres.map((g) => g.count), 1)
  const maxEraCount   = Math.max(...data.eras.map((e) => e.count), 1)
  const maxTierCount  = Math.max(...data.tierDist.map((t) => t.count), 1)

  // Human-readable summary headline
  const headline = (() => {
    const parts: string[] = []
    if (data.topGenre) parts.push(data.topGenre)
    if (data.topEra)   parts.push(data.topEra)
    if (parts.length === 0) return null
    return parts.join(" · ")
  })()

  return (
    <div className="flex flex-col gap-10">

      {/* ── Headline ── */}
      {headline && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/30">
            Top affinity
          </p>
          <p className="mt-0.5 text-base font-bold text-white/85">{headline}</p>
        </div>
      )}

      {/* ── Collection stats ── */}
      <div>
        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/35">
          Collection
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {data.mediaSplit.map((m) => (
            <div
              key={m.mediaType}
              className="flex flex-col gap-0.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
            >
              <span className="text-[11px] font-medium text-white/35">{mediaLabel(m.mediaType)}</span>
              <span className="text-lg font-black text-white tabular-nums">{m.count}</span>
              <span className={`text-[11px] font-semibold tabular-nums ${scoreToBg(m.avgScore).replace("bg-", "text-").replace("-500", "-400").replace("-700", "-400")}`}>
                {m.avgScore.toFixed(1)} avg
              </span>
            </div>
          ))}
          {/* Total */}
          <div className="flex flex-col gap-0.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-3.5 py-3">
            <span className="text-[11px] font-medium text-white/35">Total Ranked</span>
            <span className="text-lg font-black text-white tabular-nums">{data.totalRated}</span>
          </div>
        </div>
      </div>

      {/* ── Genre affinity ── */}
      {data.genres.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/35">
            Genre affinity
          </p>
          <div className="flex flex-col gap-2.5">
            {data.genres.map((g) => (
              <BarRow
                key={g.genre}
                label={g.genre}
                score={g.avgScore}
                count={g.count}
                maxCount={maxGenreCount}
                scoreColor={g.tierText}
              />
            ))}
          </div>
          <p className="mt-2.5 text-[10px] text-white/20">
            Bar = avg score · ×N = titles ranked in this genre
          </p>
        </div>
      )}

      {/* ── Era breakdown ── */}
      {data.eras.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/35">
            Era breakdown
          </p>
          <div className="flex flex-col gap-2.5">
            {data.eras.map((e) => (
              <BarRow
                key={e.decade}
                label={e.decade}
                score={e.avgScore}
                count={e.count}
                maxCount={maxEraCount}
                scoreColor={scoreToBg(e.avgScore).replace("bg-", "text-").replace("-500", "-400").replace("-700", "-400")}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Tier breakdown ── */}
      {data.tierDist.length > 0 && (
        <div>
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-white/35">
            How you rate things
          </p>
          <div className="flex flex-col gap-2">
            {data.tierDist.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className={`w-24 flex-shrink-0 text-[12px] font-semibold ${t.tierText}`}>
                  {t.label}
                </span>
                <div className="relative flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/20"
                    style={{ width: `${(t.count / maxTierCount) * 100}%` }}
                  />
                </div>
                <span className="w-8 flex-shrink-0 text-right text-[12px] font-bold text-white/50 tabular-nums">
                  {t.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
