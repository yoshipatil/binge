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
    // Update name/email always. Only update image if user has no custom upload
    // (i.e. googleImage is null or image === googleImage — they haven't overridden it).
    const hasCustomAvatar = byId.googleImage && byId.image !== byId.googleImage
    const imageUpdate = hasCustomAvatar ? {} : { image, googleImage: image }
    if (byId.name !== name || !hasCustomAvatar) {
      await prisma.user.update({ where: { id }, data: { name, email, ...imageUpdate } }).catch(() => {})
    }
    return { canonicalId: byId.id, hasUsername: !!byId.username }
  }

  // 2. No record for this token.sub — check if a user exists with the same email.
  if (email) {
    const byEmail = await prisma.user.findFirst({ where: { email } })
    if (byEmail) {
      const hasCustomAvatar = byEmail.googleImage && byEmail.image !== byEmail.googleImage
      const imageUpdate = hasCustomAvatar ? {} : { image, googleImage: image }
      if (byEmail.name !== name || !hasCustomAvatar) {
        await prisma.user.update({ where: { id: byEmail.id }, data: { name, email, ...imageUpdate } }).catch(() => {})
      }
      return { canonicalId: byEmail.id, hasUsername: !!byEmail.username }
    }
  }

  // 3. Genuinely new user — create a record, store Google image in both fields
  await prisma.user.create({ data: { id, name, email, image, googleImage: image } }).catch(() => {})
  return { canonicalId: id, hasUsername: false }
}
