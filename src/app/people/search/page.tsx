"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Search, Users, AtSign } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import FollowButton from "@/components/FollowButton"

interface UserResult {
  id: string
  name: string | null
  image: string | null
  username: string | null
  isFollowing: boolean
}

export default function PeopleSearchPage() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<UserResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (q: string) => {
    setQuery(q)
    if (q.trim().length < 2) { setResults([]); setSearched(false); return }
    setLoading(true)
    setSearched(true)
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.users ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <div className="mx-auto max-w-xl px-4 py-6 pb-28 md:pb-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/people"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Back to Circle"
        >
          <ArrowLeft className="h-4 w-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight">Find People</h1>
          <p className="text-xs text-white/40">Search by name or @username</p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="@username or full name..."
          autoCapitalize="none"
          autoCorrect="off"
          className="h-12 w-full appearance-none rounded-xl border border-white/12 bg-white/[0.06] py-3 pl-10 pr-4 text-base leading-normal text-white placeholder:text-white/30 focus:border-blue-500/50 focus:bg-white/[0.08] focus:outline-none transition-all"
        />
      </div>

      {loading && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3.5">
              <Skeleton className="h-11 w-11 rounded-full bg-white/8 flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28 bg-white/8" />
                <Skeleton className="h-3 w-20 bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 rounded-2xl bg-white/[0.05] px-4 py-3.5 hover:bg-white/[0.08] transition-colors"
            >
              <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative h-11 w-11 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                  {user.image ? (
                    <Image src={user.image} alt={user.name ?? ""} fill sizes="44px" className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-400">{user.name?.[0]?.toUpperCase() ?? "?"}</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white/90 truncate">{user.name ?? "Anonymous"}</p>
                  {user.username && (
                    <p className="flex items-center gap-0.5 text-xs text-white/35 truncate">
                      <AtSign className="h-3 w-3" />
                      {user.username}
                    </p>
                  )}
                </div>
              </Link>
              <FollowButton targetId={user.id} initialIsFollowing={user.isFollowing} />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm font-semibold text-white/50">No one found for &quot;{query}&quot;</p>
          <p className="text-xs text-white/25">Try a name or @username</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <Users className="h-7 w-7 text-blue-400/60" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/50">Find people on Binge</p>
            <p className="mt-0.5 text-xs text-white/25">Search by name or @username</p>
          </div>
        </div>
      )}
    </div>
  )
}
