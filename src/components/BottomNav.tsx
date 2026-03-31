"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Home, Star, Search, Sparkles, Users, LogIn } from "lucide-react"
import AccountMenu from "@/components/AccountMenu"

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/rankings", label: "Rankings", icon: Star },
  { href: "/search", label: "Search", icon: Search },
  { href: "/recommendations", label: "For You", icon: Sparkles },
  { href: "/people", label: "Circle", icon: Users },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="flex items-center justify-around bg-black/90 px-2 backdrop-blur-xl">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 min-h-[56px]"
            >
              <div className={`flex items-center justify-center rounded-xl p-1.5 transition-all duration-200 ${active ? "bg-blue-500/15" : ""}`}>
                <Icon className={`h-[22px] w-[22px] transition-colors duration-200 ${active ? "text-blue-400" : "text-white/35"}`} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide transition-colors duration-200 ${active ? "text-blue-400" : "text-white/30"}`}>
                {label}
              </span>
            </Link>
          )
        })}

        {/* Auth tab */}
        {session?.user ? (
          <AccountMenu
            trigger={
              <div className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 min-h-[56px] cursor-pointer">
                <div className="flex h-[34px] w-[34px] items-center justify-center">
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name ?? ""}
                      width={28}
                      height={28}
                      className="rounded-full ring-1 ring-white/20"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-blue-500/30" />
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-wide text-white/30">Me</span>
              </div>
            }
          />
        ) : (
          <Link
            href="/sign-in"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 min-h-[56px]"
          >
            <div className="flex items-center justify-center rounded-xl p-1.5">
              <LogIn className="h-[22px] w-[22px] text-white/35" />
            </div>
            <span className="text-[10px] font-medium tracking-wide text-white/30">Sign in</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
