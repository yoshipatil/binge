"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Star, Bookmark, Sparkles, Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

const links = [
  { href: "/rankings", label: "Rankings", icon: Star },
  { href: "/watchlist", label: "Watchlist", icon: Bookmark },
  { href: "/recommendations", label: "For You", icon: Sparkles },
]

// Sleek play-button icon mark
function BingeIcon() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 opacity-90" />
      {/* Play triangle */}
      <svg viewBox="0 0 24 24" className="relative z-10 h-4 w-4" fill="white">
        <path d="M8 5.14v14l11-7-11-7z" />
      </svg>
    </div>
  )
}

function BingeLogo() {
  return (
    <span className="text-xl font-black tracking-tight">
      <span className="bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 bg-clip-text text-transparent">
        Binge
      </span>
    </span>
  )
}

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <BingeIcon />
          <BingeLogo />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/")
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          })}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white/70 hover:text-white">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-56 border-white/10 bg-zinc-950">
              <div className="flex flex-col gap-1 pt-6">
                {links.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
