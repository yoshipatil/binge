import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { syncUser } from "@/lib/syncUser"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    // Persist userId (Google's stable sub ID) onto every session object.
    // This is what all API routes read with: const session = await auth()
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },

    // Sync the user's Google profile into our User table on every sign-in.
    // The jwt callback receives `user` only on the initial sign-in event —
    // on subsequent requests it only gets the cached token, so this runs
    // once per login rather than on every page load.
    async jwt({ token, user }) {
      if (user && token.sub) {
        await syncUser({ id: token.sub, name: user.name, email: user.email, image: user.image })
      }
      return token
    },
  },
  pages: {
    signIn: "/sign-in",
  },
})
