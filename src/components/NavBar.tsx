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

// Icon mark: film strip with a star cut-out — cinematic + rating in one shape
function BingeIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      {/* Rounded rect background */}
      <rect width="32" height="32" rx="8" fill="url(#bg)" />
      {/* Film perforations — top */}
      <rect x="4" y="4" width="4" height="4" rx="1" fill="white" fillOpacity="0.25" />
      <rect x="14" y="4" width="4" height="4" rx="1" fill="white" fillOpacity="0.25" />
      <rect x="24" y="4" width="4" height="4" rx="1" fill="white" fillOpacity="0.25" />
      {/* Film perforations — bottom */}
      <rect x="4" y="24" width="4" height="4" rx="1" fill="white" fillOpacity="0.25" />
      <rect x="14" y="24" width="4" height="4" rx="1" fill="white" fillOpacity="0.25" />
      <rect x="24" y="24" width="4" height="4" rx="1" fill="white" fillOpacity="0.25" />
      {/* Star in center */}
      <path
        d="M16 10l1.6 4.9h5.2l-4.2 3 1.6 4.9L16 20l-4.2 2.8 1.6-4.9-4.2-3h5.2z"
        fill="white"
      />
    </svg>
  )
}

function BingeLogo() {
  return (
    <span className="text-xl font-black tracking-tight">
      <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
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
