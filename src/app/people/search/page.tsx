"use client"

import { useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Search, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import FollowButton from "@/components/FollowButton"

interface UserResult {
  id: string
  name: string | null
  image: string | null
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
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
          aria-label="Back to Friends"
        >
          <ArrowLeft className="h-4 w-4 text-white/60" />
        </Link>
        <div>
          <h1 className="text-xl font-black tracking-tight">Find People</h1>
          <p className="text-xs text-white/40">Search by name to follow people</p>
        </div>
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 pointer-events-none" />
        <input
          autoFocus
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Search by name..."
          className="h-12 w-full rounded-xl border border-white/8 bg-white/5 pl-10 pr-4 text-base text-white placeholder:text-white/25 focus:border-blue-500/40 focus:bg-white/8 focus:outline-none transition-all"
        />
      </div>

      {loading && (
        <div className="flex flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full bg-white/8" />
              <Skeleton className="h-4 w-36 bg-white/8" />
            </div>
          ))}
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="flex flex-col gap-2">
          {results.map((user) => (
            <div key={user.id} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3">
              <Link href={`/profile/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
                  {user.image ? (
                    <Image src={user.image} alt={user.name ?? ""} fill sizes="40px" className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-400">{user.name?.[0]?.toUpperCase() ?? "?"}</span>
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-white/85 truncate">{user.name ?? "Anonymous"}</span>
              </Link>
              <FollowButton targetId={user.id} initialIsFollowing={false} />
            </div>
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-sm font-semibold text-white/50">No one found for &quot;{query}&quot;</p>
          <p className="text-xs text-white/25">Try a different name</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
            <Users className="h-7 w-7 text-white/20" />
          </div>
          <p className="text-sm text-white/35">Type at least 2 characters</p>
        </div>
      )}
    </div>
  )
}
