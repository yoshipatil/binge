"use client"

import { useRef, useState, useTransition } from "react"
import Image from "next/image"
import { Camera, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"

interface AvatarUploadProps {
  currentImage: string | null
  name: string | null
}

export default function AvatarUpload({ currentImage, name }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(currentImage)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB")
      return
    }

    // Optimistic preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)

    const form = new FormData()
    form.append("file", file)

    startTransition(async () => {
      try {
        const res = await fetch("/api/users/avatar", { method: "POST", body: form })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err.error ?? "Upload failed — try again")
          setPreview(currentImage)
          return
        }
        const { url } = await res.json()
        setPreview(url)
        toast.success("Profile photo updated")
        router.refresh()
      } catch {
        toast.error("Network error — try again")
        setPreview(currentImage)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    })
  }

  return (
    <button
      type="button"
      aria-label="Change profile photo"
      className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      onClick={() => inputRef.current?.click()}
      disabled={isPending}
    >
      {/* Avatar image */}
      {preview ? (
        <Image
          src={preview}
          alt={name ?? "Avatar"}
          fill
          sizes="80px"
          className="object-cover"
        />
      ) : (
        <div className="h-full w-full bg-blue-500/20 flex items-center justify-center">
          <span className="text-2xl font-black text-blue-400">
            {name?.[0]?.toUpperCase() ?? "?"}
          </span>
        </div>
      )}

      {/* Hover / loading overlay */}
      <div className={`absolute inset-0 flex items-center justify-center rounded-full transition-all duration-200 ${
        isPending
          ? "bg-black/60"
          : "bg-black/0 group-hover:bg-black/50"
      }`}>
        {isPending ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ""
        }}
      />
    </button>
  )
}
