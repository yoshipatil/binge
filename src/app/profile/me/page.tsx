import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { syncUser } from "@/lib/syncUser"

// /profile/me — ensures the current user exists in our User table,
// then redirects to their profile page. This handles the case where
// someone visits their profile before the jwt callback has run.
export default async function MyProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/sign-in")

  // Eagerly sync so the profile page never 404s for the current user
  await syncUser(session.user as Parameters<typeof syncUser>[0])

  redirect(`/profile/${session.user.id}`)
}
