"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Trophy } from "lucide-react"

const TABS = [
  { href: "/people", label: "Circle", icon: Users },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
]

export default function CircleLeaderboardTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 min-h-[44px] ${
              active
                ? "bg-white/10 text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        )
      })}
    </div>
  )
}
