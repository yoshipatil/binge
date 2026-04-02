"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Share2, Download, RefreshCw, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"

interface ShareCardPreviewProps {
  userId: string
}

type CardState =
  | { status: "loading" }
  | { status: "loaded"; blobUrl: string }
  | { status: "error"; code: number | null }

export default function ShareCardPreview({ userId }: ShareCardPreviewProps) {
  const [cardState, setCardState] = useState<CardState>({ status: "loading" })
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [storiesLoading, setStoriesLoading] = useState(false)
  const blobUrlRef = useRef<string | null>(null)

  // ── Load card via fetch (not <img> onError) so we get the real HTTP status ──
  useEffect(() => {
    let cancelled = false

    // Revoke previous blob URL to free memory
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    setCardState({ status: "loading" })

    // Cache-bust on every retry attempt so the browser never serves a cached error
    const url = `/api/share/card?userId=${userId}&type=preview${loadAttempt > 0 ? `&_cb=${loadAttempt}` : ""}`

    fetch(url)
      .then(async (res) => {
        if (cancelled) return
        if (!res.ok) {
          setCardState({ status: "error", code: res.status })
          return
        }
        const blob = await res.blob()
        if (cancelled) return
        const objectUrl = URL.createObjectURL(blob)
        blobUrlRef.current = objectUrl
        setCardState({ status: "loaded", blobUrl: objectUrl })
      })
      .catch(() => {
        if (!cancelled) setCardState({ status: "error", code: null })
      })

    return () => {
      cancelled = true
    }
  }, [userId, loadAttempt])

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const handleRetry = useCallback(() => {
    setLoadAttempt((n) => n + 1)
  }, [])

  const handleShare = useCallback(async () => {
    try {
      const res = await fetch(`/api/share/card?userId=${userId}&type=preview`)
      if (!res.ok) throw new Error("Failed")
      const blob = await res.blob()
      const file = new File([blob], "binge-top5.png", { type: "image/png" })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "My Top 5 on Binge",
          text: "Check out my Top 5 rankings on Binge!",
          files: [file],
        })
        return
      }

      // Fallback: download
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "binge-top5.png"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Card downloaded!")
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Couldn't share card")
      }
    }
  }, [userId])

  const handleDownloadStories = useCallback(async () => {
    setStoriesLoading(true)
    try {
      const res = await fetch(`/api/share/card?userId=${userId}&type=stories`)
      if (!res.ok) throw new Error("Failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "binge-top5-stories.png"
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Stories card downloaded!")
    } catch {
      toast.error("Couldn't generate stories card")
    } finally {
      setStoriesLoading(false)
    }
  }, [userId])

  // ── Error message based on actual HTTP status code ──
  function errorContent(code: number | null) {
    if (code === 400) {
      return {
        headline: "Not enough rankings yet",
        sub: "Keep ranking to unlock your Binge Card",
      }
    }
    if (code === 429) {
      return {
        headline: "Too many requests",
        sub: "Wait a minute then tap Retry",
      }
    }
    // 500 / 504 / null (network error)
    return {
      headline: "Couldn't generate card",
      sub: "Something went wrong — tap Retry",
    }
  }

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/55">
          Your Binge Card
        </h2>
        <span className="text-[11px] text-white/25">Share your Top 5</span>
      </div>

      {/* Card preview — 1:1 aspect ratio matching the 600×600 PNG */}
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "1 / 1" }}>

        {/* Shimmer skeleton — shown while loading */}
        {cardState.status === "loading" && (
          <div className="absolute inset-0 overflow-hidden rounded-2xl bg-zinc-900">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.6s infinite",
              }}
            />
          </div>
        )}

        {/* Error state — message matches the real failure reason */}
        {cardState.status === "error" && (() => {
          const { headline, sub } = errorContent(cardState.code)
          return (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-900/80 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <AlertCircle className="h-5 w-5 text-white/30" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/60">{headline}</p>
                <p className="mt-1 text-xs text-white/30">{sub}</p>
              </div>
              <button
                onClick={handleRetry}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-white/5 px-4 py-2 text-xs font-semibold text-white/50 hover:bg-white/10 hover:text-white active:scale-95 transition-all duration-150"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )
        })()}

        {/* Loaded card image */}
        {cardState.status === "loaded" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cardState.blobUrl}
            alt="Your Binge Card — Top 5 rankings"
            className="w-full h-full object-cover rounded-2xl"
          />
        )}
      </div>

      {/* CTAs — only shown once card is loaded */}
      <div
        className={`mt-3 flex gap-2 transition-opacity duration-300 ${
          cardState.status === "loaded" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={handleShare}
          className="flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 active:bg-blue-700 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
        <button
          onClick={handleDownloadStories}
          disabled={storiesLoading}
          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Download as Instagram Stories (1080×1920)"
        >
          <Download className="h-4 w-4" />
          <span>Stories</span>
        </button>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
