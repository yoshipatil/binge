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
    async jwt({ token, user }) {
      if (user && token.sub) {
        await syncUser({ id: token.sub, name: user.name, email: user.email, image: user.image })
      }
      return token
    },
  },
})
