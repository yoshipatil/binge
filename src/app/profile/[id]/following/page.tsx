"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, AtSign, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import FollowButton from "@/components/FollowButton"

interface UserResult {
  id: string
  name: string | null
  image: string | null
  username: string | null
  isFollowing: boolean
  isSelf: boolean
}

function UserCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white/[0.03] px-4 py-3.5 flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full bg-white/8 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32 bg-white/8" />
        <Skeleton className="h-3 w-20 bg-white/8" />
      </div>
      <Skeleton className="h-8 w-20 rounded-md bg-white/8" />
    </div>
  )
}

export default function FollowingPage() {
  const params = useParams()
  const id = params.id as string

  const [users, setUsers] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/users/${id}/following`)
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users ?? [])
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="mx-auto max-w-xl px-4 py-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/profile/${id}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/70 transition-colors hover:bg-white/[0.10] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-semibold text-white">Following</h1>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? (
          <>
            <UserCardSkeleton />
            <UserCardSkeleton />
            <UserCardSkeleton />
          </>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-white/40">
            <Users className="h-10 w-10" />
            <p className="text-sm">No one here yet</p>
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl bg-white/[0.03] px-4 py-3.5 hover:bg-white/[0.05] transition-colors flex items-center gap-3"
            >
              {/* Avatar */}
              <Link href={`/profile/${user.id}`} className="shrink-0">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.name ?? "User"}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 font-semibold text-sm">
                    {user.name ? user.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={`/profile/${user.id}`}>
                  <p className="text-sm font-medium text-white truncate hover:text-white/80 transition-colors">
                    {user.name ?? "Unknown"}
                  </p>
                </Link>
                {user.username && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <AtSign className="h-3 w-3 text-white/40" />
                    <span className="text-xs text-white/40 truncate">{user.username}</span>
                  </div>
                )}
              </div>

              {/* Follow button */}
              {!user.isSelf && (
                <FollowButton targetId={user.id} initialIsFollowing={user.isFollowing} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
