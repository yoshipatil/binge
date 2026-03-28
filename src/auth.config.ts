// Edge-compatible auth config — no Prisma, no Node-only imports.
// Used by middleware (Edge runtime). The full auth.ts extends this with
// the syncUser jwt callback that needs Prisma.
import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"

export const authConfig = {
  providers: [Google],
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
} satisfies NextAuthConfig
