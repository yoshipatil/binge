import { auth } from "@/auth"
import { NextResponse } from "next/server"

// Pages that require a signed-in user
const PROTECTED = ["/rankings", "/watchlist", "/recommendations"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))

  if (isProtected && !req.auth) {
    const signIn = new URL("/sign-in", req.url)
    signIn.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signIn)
  }
})

export const config = {
  // Run on all routes except static assets and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
}
