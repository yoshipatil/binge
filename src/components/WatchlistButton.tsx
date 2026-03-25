"use client"

import { useState } from "react"
import { Bookmark, BookmarkCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
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
    const wasInWatchlist = inWatchlist
    // Optimistic update
    setInWatchlist(!wasInWatchlist)

    try {
      let res: Response
      if (!wasInWatchlist) {
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
        setInWatchlist(wasInWatchlist) // revert
        toast.error("Failed to update watchlist")
      } else {
        toast.success(wasInWatchlist ? "Removed from watchlist" : "Added to watchlist")
      }
    } catch {
      setInWatchlist(wasInWatchlist) // revert on network error
      toast.error("Network error — try again")
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
