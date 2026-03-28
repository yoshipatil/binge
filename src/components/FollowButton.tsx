"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { UserPlus, UserMinus } from "lucide-react"
import toast from "react-hot-toast"

interface FollowButtonProps {
  targetId: string
  initialIsFollowing: boolean
}

export default function FollowButton({ targetId, initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      if (isFollowing) {
        const res = await fetch(`/api/follow?followingId=${targetId}`, { method: "DELETE" })
        if (res.status === 401) { window.location.href = "/sign-in"; return }
        if (!res.ok) { toast.error("Failed to unfollow"); return }
        setIsFollowing(false)
        toast.success("Unfollowed")
      } else {
        const res = await fetch("/api/follow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ followingId: targetId }),
        })
        if (res.status === 401) { window.location.href = "/sign-in"; return }
        if (!res.ok) { toast.error("Failed to follow"); return }
        setIsFollowing(true)
        toast.success("Following!")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className={
        isFollowing
          ? "gap-1.5 border-white/15 text-white/60 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 transition-colors"
          : "gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border-0"
      }
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-3.5 w-3.5" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="h-3.5 w-3.5" />
          Follow
        </>
      )}
    </Button>
  )
}
