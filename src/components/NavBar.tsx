"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Star, Bookmark, Sparkles, Home } from "lucide-react"
import BingeLogo from "@/components/BingeLogo"

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/rankings", label: "Rankings", icon: Star },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/recommendations", label: "For You", icon: Sparkles },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <BingeLogo size={32} />
        </Link>

        {/* Desktop nav — hidden on mobile (bottom nav handles it) */}
        <div className="hidden md:flex items-center gap-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "text-white"
                    : "text-white/45 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {active && (
                  <span className="absolute -bottom-[11px] left-1/2 h-[2px] w-6 -translate-x-1/2 rounded-full bg-blue-400/60" />
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Cinematic bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/25 to-transparent" />
    </nav>
  )
}
