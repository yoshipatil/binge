"use client"

import { useState, useCallback } from "react"
import { Share2, Download, RefreshCw } from "lucide-react"
import toast from "react-hot-toast"

interface ShareCardPreviewProps {
  userId: string
}

export default function ShareCardPreview({ userId }: ShareCardPreviewProps) {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading")
  const [storiesLoading, setStoriesLoading] = useState(false)

  const previewSrc = `/api/share/card?userId=${userId}&type=preview`

  const handleShare = useCallback(async () => {
    try {
      const res = await fetch(previewSrc)
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
  }, [previewSrc])

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

  const handleRetry = useCallback(() => {
    setImageState("loading")
  }, [])

  return (
    <div className="mt-8">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/55">
          Your Binge Card
        </h2>
        <span className="text-[11px] text-white/25">Share your Top 5</span>
      </div>

      {/* Card preview container — 1:1 aspect ratio matching the 600×600 PNG */}
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "1 / 1" }}>
        {/* Skeleton shimmer — shown while image loads */}
        {imageState === "loading" && (
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

        {/* Error state */}
        {imageState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-zinc-900/80 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
              <Share2 className="h-5 w-5 text-white/30" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/60">Card not ready yet</p>
              <p className="mt-1 text-xs text-white/30">
                Rate more titles to generate your Binge Card
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-white/50 hover:bg-white/10 hover:text-white transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* The actual card PNG */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={imageState === "loading" ? "img" : undefined}
          src={previewSrc}
          alt="Your Binge Card — Top 5 rankings"
          className={`w-full h-full object-cover rounded-2xl transition-opacity duration-500 ${
            imageState === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageState("loaded")}
          onError={() => setImageState("error")}
        />
      </div>

      {/* CTAs — only shown once card is loaded */}
      <div
        className={`mt-3 flex gap-2 transition-opacity duration-300 ${
          imageState === "loaded" ? "opacity-100" : "opacity-0 pointer-events-none"
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
