import { prisma } from "@/lib/prisma"

interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

// Upsert the user's Google profile into our User table.
// Returns canonical user ID and whether they have a username set.
// Callers should update token.sub to the returned ID so all devices converge.
export async function syncUser(user: SessionUser): Promise<{ canonicalId: string; hasUsername: boolean }> {
  const { id, name, email, image } = user

  // 1. Prefer lookup by the session ID (fast path, normal case)
  const byId = await prisma.user.findUnique({ where: { id } })
  if (byId) {
    if (byId.name !== name || byId.image !== image) {
      await prisma.user.update({ where: { id }, data: { name, email, image } }).catch(() => {})
    }
    return { canonicalId: byId.id, hasUsername: !!byId.username }
  }

  // 2. No record for this token.sub — check if a user exists with the same email.
  if (email) {
    const byEmail = await prisma.user.findFirst({ where: { email } })
    if (byEmail) {
      if (byEmail.name !== name || byEmail.image !== image) {
        await prisma.user.update({ where: { id: byEmail.id }, data: { name, email, image } }).catch(() => {})
      }
      return { canonicalId: byEmail.id, hasUsername: !!byEmail.username }
    }
  }

  // 3. Genuinely new user — create a record
  await prisma.user.create({ data: { id, name, email, image } }).catch(() => {})
  return { canonicalId: id, hasUsername: false }
}
