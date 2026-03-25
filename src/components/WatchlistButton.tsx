"use client"

import { useState } from "react"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MediaType } from "@/types"

interface WatchlistButtonProps {
  tmdbId: number
  mediaType: MediaType
  initialInWatchlist: boolean
}

export default function WatchlistButton({
  tmdbId,
  mediaType,
  initialInWatchlist,
}: WatchlistButtonProps) {
  const [inWatchlist, setInWatchlist] = useState(initialInWatchlist)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    // Optimistic update
    setInWatchlist((prev) => !prev)

    try {
      let res: Response
      if (!inWatchlist) {
        res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId, mediaType }),
        })
      } else {
        res = await fetch(`/api/watchlist?tmdbId=${tmdbId}&mediaType=${mediaType}`, {
          method: "DELETE",
        })
      }
      if (!res.ok) {
        // Revert optimistic update on server error
        setInWatchlist((prev) => !prev)
      }
    } catch {
      // Revert on network error
      setInWatchlist((prev) => !prev)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={inWatchlist ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="gap-2"
    >
      {inWatchlist ? (
        <>
          <BookmarkCheck className="h-4 w-4" />
          Watchlisted
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" />
          Watchlist
        </>
      )}
    </Button>
  )
}
