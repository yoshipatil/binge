import { prisma } from "@/lib/prisma"

interface SessionUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
}

// Upsert the user's Google profile into our User table.
// Called eagerly in /profile/me and lazily in the ratings GET route.
// Neon HTTP adapter doesn't support transactions — use find + create/update.
export async function syncUser(user: SessionUser): Promise<void> {
  const { id, name, email, image } = user
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    await prisma.user.create({ data: { id, name, email, image } }).catch(() => {})
  } else if (existing.name !== name || existing.image !== image) {
    await prisma.user.update({ where: { id }, data: { name, email, image } }).catch(() => {})
  }
}
