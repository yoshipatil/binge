import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

// Pages that require a signed-in user
const PROTECTED = ["/rankings", "/watchlist", "/recommendations", "/people", "/profile"]

// Pages that should never trigger the profile-setup redirect
const SETUP_EXEMPT = ["/profile/setup", "/sign-in", "/api", "/_next", "/favicon", "/icon", "/manifest"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !req.auth) {
    const signIn = new URL("/sign-in", req.url)
    signIn.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signIn)
  }

  // Redirect authenticated users who haven't set a username to profile setup
  // Skip if already on an exempt path
  const isExempt = SETUP_EXEMPT.some((p) => pathname.startsWith(p))
  if (req.auth && !isExempt) {
    const token = req.auth as { sub?: string; hasUsername?: boolean }
    if (token.hasUsername === false) {
      return NextResponse.redirect(new URL("/profile/setup", req.url))
    }
  }
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.ico$).*)"],
}
