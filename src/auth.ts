import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { syncUser } from "@/lib/syncUser"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // Sync the user's Google profile into our User table on sign-in.
    // jwt receives `user` only on the initial sign-in — subsequent requests
    // get the cached token, so this runs once per login.
    // syncUser returns the canonical DB user ID; update token.sub so all
    // devices converge on the same user record even if subs differed.
    async jwt({ token, user }) {
      if (user && token.sub) {
        // Initial sign-in: sync user and store hasUsername
        const { canonicalId, hasUsername } = await syncUser({ id: token.sub, name: user.name, email: user.email, image: user.image })
        token.sub = canonicalId
        token.hasUsername = hasUsername
      } else if (token.sub && token.hasUsername === undefined) {
        // Existing session before this field was added — check DB once, then cache in token
        const { prisma } = await import("@/lib/prisma")
        const dbUser = await prisma.user.findUnique({ where: { id: token.sub }, select: { username: true } })
        token.hasUsername = !!dbUser?.username
      }
      return token
    },
  },
})
