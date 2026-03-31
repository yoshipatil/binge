"use client"

import { useState } from "react"
import { Share2, Download, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

interface ShareCardButtonProps {
  userId: string
}

export default function ShareCardButton({ userId }: ShareCardButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleShare(type: "preview" | "stories") {
    setLoading(true)
    try {
      const res = await fetch(`/api/share/card?userId=${userId}&type=${type}`)
      if (!res.ok) throw new Error("Failed to generate card")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)

      // Try Web Share API (mobile native share sheet) first
      if (type === "preview" && navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], "binge-top5.png", { type: "image/png" })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "My Top 5 on Binge",
              text: "Check out my Top 5 movie & TV rankings on Binge!",
              files: [file],
            })
            URL.revokeObjectURL(url)
            return
          }
        } catch (shareErr) {
          // Share cancelled or not supported — fall through to download
          if ((shareErr as Error).name === "AbortError") {
            URL.revokeObjectURL(url)
            return
          }
        }
      }

      // Fallback: download the PNG
      const a = document.createElement("a")
      a.href = url
      a.download = type === "stories" ? "binge-top5-stories.png" : "binge-top5.png"
      a.click()
      URL.revokeObjectURL(url)
      toast.success(type === "stories" ? "Stories card downloaded!" : "Card downloaded!")
    } catch {
      toast.error("Couldn't generate card — try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleShare("preview")}
        disabled={loading}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        Share
      </button>
      <button
        onClick={() => handleShare("stories")}
        disabled={loading}
        className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title="Download as Instagram Stories (1080×1920)"
      >
        <Download className="h-4 w-4" />
        <span className="text-xs">Stories</span>
      </button>
    </div>
  )
}
