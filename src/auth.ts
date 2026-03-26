import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  // Persist userId (Google's stable sub ID) onto every session object.
  // This is what all API routes read with: const session = await auth()
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
  pages: {
    signIn: "/sign-in",
  },
})
