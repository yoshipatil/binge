"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { Clapperboard, AtSign, ChevronRight, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function ProfileSetupPage() {
  const router = useRouter()
  const { data: session, update: updateSession } = useSession()

  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleUsernameChange = (val: string) => {
    setError("")
    // Only allow a-z, 0-9, underscore — auto-lowercase
    setUsername(val.toLowerCase().replace(/[^a-z0-9_]/g, ""))
  }

  const isValid = username.length >= 3 && username.length <= 20

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, bio }),
      })

      if (res.status === 409) {
        setError("That username is already taken — try another")
        setLoading(false)
        return
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Something went wrong")
        setLoading(false)
        return
      }

      // Force session refresh so middleware sees hasUsername = true
      await updateSession()
      toast.success("Profile set up!")
      router.push("/")
      router.refresh()
    } catch {
      setError("Network error — try again")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <Clapperboard className="h-10 w-10 text-blue-400" />
        <h1 className="text-2xl font-black tracking-tight">Set up your profile</h1>
        <p className="text-sm text-white/40 text-center max-w-xs">
          Choose a username so friends can find you. You can always change it later.
        </p>
      </div>

      {/* Avatar preview */}
      {session?.user?.image && (
        <div className="mb-6 relative h-20 w-20 overflow-hidden rounded-full ring-2 ring-white/10">
          <Image
            src={session.user.image}
            alt={session.user.name ?? ""}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      )}

      {session?.user?.name && (
        <p className="mb-6 text-base font-semibold text-white/70">{session.user.name}</p>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        {/* Username */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Username
          </label>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type="text"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="yashpatil"
              maxLength={20}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              className="h-12 w-full appearance-none rounded-xl border border-white/8 bg-white/5 py-3 pl-9 pr-4 text-base leading-normal text-white placeholder:text-white/25 focus:border-blue-500/40 focus:bg-white/8 focus:outline-none transition-all"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/30">Letters, numbers, underscores only</p>
            <p className={`text-xs tabular-nums ${username.length > 17 ? "text-amber-400" : "text-white/25"}`}>
              {username.length}/20
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
            Bio <span className="normal-case font-normal text-white/20">(optional)</span>
          </label>
          <div className="relative">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="I watch too many films..."
              maxLength={160}
              rows={2}
              className="w-full appearance-none rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-base leading-normal text-white placeholder:text-white/25 focus:border-blue-500/40 focus:bg-white/8 focus:outline-none transition-all resize-none"
            />
          </div>
          <p className={`text-xs text-right tabular-nums ${bio.length > 140 ? "text-amber-400" : "text-white/25"}`}>
            {bio.length}/160
          </p>
        </div>

        <button
          type="submit"
          disabled={!isValid || loading}
          className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Let&apos;s go
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
