// POST /api/users/avatar
// Accepts a multipart/form-data upload with field "file".
// Validates: image only, max 5MB, JPEG/PNG/WebP/AVIF.
// Uploads to Vercel Blob, saves URL to User.image in DB.
// Returns { url } on success.
//
// DELETE /api/users/avatar
// Removes custom avatar — reverts to Google OAuth image (stored in User.googleImage).

import { type NextRequest, NextResponse } from "next/server"
import { put, del } from "@vercel/blob"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimitedResponse } from "@/lib/rateLimit"

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"]

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`avatar-upload:${userId}`, 5, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const formData = await request.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP, or AVIF." },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5MB." },
      { status: 400 }
    )
  }

  // Delete old custom avatar from Blob if it exists
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, googleImage: true },
  })

  if (existingUser?.image && existingUser.image !== existingUser?.googleImage) {
    // It's a custom blob URL — delete it to avoid storage buildup
    try {
      await del(existingUser.image)
    } catch {
      // Non-fatal — old blob may already be gone
    }
  }

  // Upload to Vercel Blob
  const ext = file.type.split("/")[1].replace("jpeg", "jpg")
  const blob = await put(`avatars/${userId}.${ext}`, file, {
    access: "public",
    addRandomSuffix: false, // deterministic URL so re-uploads replace cleanly
  })

  // Save new URL to DB
  await prisma.user.update({
    where: { id: userId },
    data: { image: blob.url },
  })

  return NextResponse.json({ url: blob.url })
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { allowed, retryAfterMs } = checkRateLimit(`avatar-delete:${userId}`, 10, 60_000)
  if (!allowed) return rateLimitedResponse(retryAfterMs)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { image: true, googleImage: true },
  })

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete blob if it's a custom upload (not the Google avatar)
  if (user.image && user.image !== user.googleImage) {
    try {
      await del(user.image)
    } catch {
      // Non-fatal
    }
  }

  // Revert to Google image (or null if no Google image)
  await prisma.user.update({
    where: { id: userId },
    data: { image: user.googleImage ?? null },
  })

  return NextResponse.json({ url: user.googleImage ?? null })
}
