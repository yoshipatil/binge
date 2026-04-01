"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface ProfileTabSwitcherProps {
  profileId: string
  totalRatings: number
}

export default function ProfileTabSwitcher({ profileId, totalRatings }: ProfileTabSwitcherProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") ?? "overview"
  const activeType = searchParams.get("type") ?? "all"

  const tabs = [
    { key: "overview", label: "Overview", href: `/profile/${profileId}` },
    { key: "rankings", label: `Rankings${totalRatings > 0 ? ` · ${totalRatings}` : ""}`, href: `/profile/${profileId}?tab=rankings` },
  ]

  const typeFilters = [
    { key: "all", label: "All", href: `/profile/${profileId}?tab=rankings` },
    { key: "movie", label: "Movies", href: `/profile/${profileId}?tab=rankings&type=movie` },
    { key: "tv", label: "TV", href: `/profile/${profileId}?tab=rankings&type=tv` },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex flex-1 items-center justify-center rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Movie / TV filter — only on Rankings tab */}
      {activeTab === "rankings" && (
        <div className="mt-3 flex gap-1.5">
          {typeFilters.map((f) => (
            <Link
              key={f.key}
              href={f.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                activeType === f.key
                  ? "bg-white/10 text-white"
                  : "text-white/35 hover:text-white/55"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
