"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Users, Zap, Trophy, Flame, ArrowLeft } from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number
  userId: string
  name: string | null
  image: string | null
  username: string | null
  value: number            // comparisons count OR divergence score
  isCurrentUser: boolean
}

interface LeaderboardData {
  mostCompared: LeaderboardEntry[]
  boldRankers: LeaderboardEntry[]
  currentUserMostCompared: LeaderboardEntry | null
  currentUserBoldRankers: LeaderboardEntry | null
}

type TabKey = "mostCompared" | "boldRankers"

// ─────────────────────────────────────────────────────────────────────────────
// Tab config
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ElementType; description: string }[] = [
  {
    key: "mostCompared",
    label: "Most Compared",
    icon: Flame,
    description: "Head-to-head battles this month",
  },
  {
    key: "boldRankers",
    label: "Bold Ranker",
    icon: Zap,
    description: "Biggest divergence from your circle",
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("mostCompared")
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)

    fetch("/api/leaderboard")
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((d: LeaderboardData) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const currentTab = TABS.find((t) => t.key === activeTab)!
  const entries = data?.[activeTab] ?? []
  const currentUserEntry =
    activeTab === "mostCompared"
      ? data?.currentUserMostCompared
      : data?.currentUserBoldRankers

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-28 md:pb-12 md:py-8">

      {/* ── Page header ── */}
      <div className="mb-6 md:mb-8">
        {/* Back link — mobile */}
        <Link
          href="/people"
          className="mb-4 flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors md:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Your Circle
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight md:text-3xl">Leaderboard</h1>
            <p className="mt-1 text-sm text-white/40">Friends only · updated daily</p>
          </div>
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
        </div>
      </div>

      {/* ── Desktop: two-column layout ── */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-6">
        {TABS.map((tab) => {
          const tabEntries = data?.[tab.key] ?? []
          const TabIcon = tab.icon
          const userEntry =
            tab.key === "mostCompared"
              ? data?.currentUserMostCompared
              : data?.currentUserBoldRankers

          return (
            <div key={tab.key} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                  <TabIcon className="h-4 w-4 text-white/50" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/80">{tab.label}</p>
                  <p className="text-[11px] text-white/35">{tab.description}</p>
                </div>
              </div>

              {loading ? (
                <LeaderboardSkeleton />
              ) : error ? (
                <ErrorState />
              ) : tabEntries.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    {tabEntries.map((entry) => (
                      <LeaderboardRow
                        key={entry.userId}
                        entry={entry}
                        tab={tab.key}
                      />
                    ))}
                  </div>
                  {userEntry && !tabEntries.some((e) => e.isCurrentUser) && (
                    <YourRankBanner entry={userEntry} tab={tab.key} />
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Mobile: tabbed layout ── */}
      <div className="md:hidden">
        {/* Tab switcher */}
        <div className="mb-5 flex gap-1 rounded-xl bg-white/[0.04] p-1">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <TabIcon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab description */}
        <p className="mb-4 text-xs text-white/35">{currentTab.description}</p>

        {/* Content */}
        {loading ? (
          <LeaderboardSkeleton />
        ) : error ? (
          <ErrorState />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {entries.map((entry) => (
                <LeaderboardRow key={entry.userId} entry={entry} tab={activeTab} />
              ))}
            </div>

            {/* Sticky your rank — only if current user not in top list */}
            {currentUserEntry && !entries.some((e) => e.isCurrentUser) && (
              <div className="mt-4">
                <YourRankBanner entry={currentUserEntry} tab={activeTab} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Row component
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  tab,
}: {
  entry: LeaderboardEntry
  tab: TabKey
}) {
  const isTop3 = entry.rank <= 3
  const rankColors = ["text-amber-400", "text-zinc-300", "text-amber-600/80"]
  const rankBgs = ["bg-amber-500/15", "bg-white/8", "bg-amber-700/10"]
  const medalEmoji = ["🥇", "🥈", "🥉"]

  return (
    <Link
      href={`/profile/${entry.userId}`}
      className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all duration-150 ${
        entry.isCurrentUser
          ? "bg-blue-500/12 ring-1 ring-blue-500/25 hover:bg-blue-500/16"
          : "bg-white/[0.04] hover:bg-white/[0.07] active:bg-white/[0.09]"
      }`}
    >
      {/* Rank */}
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-black ${
          isTop3
            ? `${rankBgs[entry.rank - 1]} ${rankColors[entry.rank - 1]}`
            : "bg-white/[0.04] text-white/30"
        }`}
      >
        {isTop3 ? (
          <span className="text-base leading-none">{medalEmoji[entry.rank - 1]}</span>
        ) : (
          <span className="tabular-nums">{entry.rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
        {entry.image ? (
          <Image src={entry.image} alt={entry.name ?? ""} fill sizes="40px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blue-500/20">
            <span className="text-sm font-bold text-blue-400">
              {entry.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          </div>
        )}
      </div>

      {/* Name + username */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-white/85 group-hover:text-white transition-colors">
            {entry.name ?? "Anonymous"}
          </p>
          {entry.isCurrentUser && (
            <span className="flex-shrink-0 rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
              You
            </span>
          )}
        </div>
        {entry.username && (
          <p className="text-[11px] text-white/30 truncate">@{entry.username}</p>
        )}
      </div>

      {/* Value */}
      <div className="flex-shrink-0 text-right">
        {tab !== "boldRankers" ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-base font-black text-white tabular-nums">{entry.value.toLocaleString()}</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wide">battles</span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-base font-black text-white tabular-nums">+{entry.value.toFixed(1)}</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wide">bold score</span>
          </div>
        )}
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// "Your Rank" sticky banner (shown when current user is outside top list)
// ─────────────────────────────────────────────────────────────────────────────

function YourRankBanner({ entry, tab }: { entry: LeaderboardEntry; tab: TabKey }) {
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/8 px-4 py-3">
      {/* Rank chip */}
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-blue-500/20 text-xs font-black text-blue-400 tabular-nums">
        {entry.rank}
      </div>

      {/* Avatar */}
      <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-blue-500/30">
        {entry.image ? (
          <Image src={entry.image} alt={entry.name ?? ""} fill sizes="36px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blue-500/20">
            <span className="text-xs font-bold text-blue-400">{entry.name?.[0]?.toUpperCase() ?? "?"}</span>
          </div>
        )}
      </div>

      {/* Name + label */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-white/85">{entry.name ?? "You"}</p>
          <span className="flex-shrink-0 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">You</span>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-blue-400/50">Your rank</p>
      </div>

      {/* Value */}
      <div className="flex-shrink-0 text-right">
        {tab !== "boldRankers" ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-base font-black text-white tabular-nums">{entry.value.toLocaleString()}</span>
            <span className="text-[10px] uppercase tracking-wide text-white/30">battles</span>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-base font-black text-white tabular-nums">+{entry.value.toFixed(1)}</span>
            <span className="text-[10px] uppercase tracking-wide text-white/30">bold score</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton / empty / error states
// ─────────────────────────────────────────────────────────────────────────────

function LeaderboardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3.5"
          style={{ opacity: 1 - i * 0.12 }}
        >
          <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-white/8 animate-pulse" />
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-white/8 animate-pulse" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3.5 w-28 rounded-full bg-white/8 animate-pulse" />
            <div className="h-3 w-16 rounded-full bg-white/5 animate-pulse" />
          </div>
          <div className="h-6 w-12 flex-shrink-0 rounded-lg bg-white/8 animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        <Users className="h-6 w-6 text-white/20" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/50">No data yet</p>
        <p className="mt-1 max-w-[200px] text-xs text-white/25">
          Follow more people and do more comparisons to populate the leaderboard.
        </p>
      </div>
      <Link
        href="/people/search"
        className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600/80 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
      >
        Find people
      </Link>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-sm text-white/40">Couldn&apos;t load leaderboard</p>
      <button
        onClick={() => window.location.reload()}
        className="text-xs text-blue-400/70 hover:text-blue-400 transition-colors"
      >
        Retry
      </button>
    </div>
  )
}
