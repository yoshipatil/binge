"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Sparkles, Bookmark } from "lucide-react"

const TABS = [
  { value: "foryou", label: "For You", icon: Sparkles },
  { value: "watchlist", label: "Up Next", icon: Bookmark },
]

export default function ForYouTabSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get("tab") ?? "foryou"

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "foryou") {
      params.delete("tab")
    } else {
      params.set("tab", value)
    }
    const query = params.toString()
    router.push(query ? `${pathname}?${query}` : pathname)
  }

  return (
    <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
      {TABS.map(({ value, label, icon: Icon }) => {
        const active = current === value
        return (
          <button
            key={value}
            onClick={() => handleChange(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 min-h-[44px] ${
              active
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
