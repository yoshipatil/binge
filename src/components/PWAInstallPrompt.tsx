"use client"

import { useState, useEffect } from "react"
import { X, Share, MoreVertical, PlusSquare } from "lucide-react"

// Detects platform so we can show the right install instructions.
// iOS has no programmatic install API — must guide the user manually.
// Android Chrome fires `beforeinstallprompt` which we can trigger on demand.

type Platform = "ios" | "android" | "other"

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other"
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return "ios"
  if (/android/i.test(ua)) return "android"
  return "other"
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standalone check
    ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  )
}

const DISMISSED_KEY = "binge_pwa_prompt_dismissed"

export default function PWAInstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<Platform>("other")
  // Android deferred install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt: () => Promise<void> } | null>(null)

  useEffect(() => {
    // Don't show if: already installed, already dismissed, or desktop
    if (isStandalone()) return
    if (localStorage.getItem(DISMISSED_KEY)) return

    const p = detectPlatform()
    setPlatform(p)

    if (p === "ios") {
      // Show manually after a short delay so it doesn't flash on load
      const t = setTimeout(() => setVisible(true), 2500)
      return () => clearTimeout(t)
    }

    if (p === "android") {
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as Event & { prompt: () => Promise<void> })
        setVisible(true)
      }
      window.addEventListener("beforeinstallprompt", handler)
      return () => window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISSED_KEY, "1")
  }

  async function handleAndroidInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    dismiss()
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-3 right-3 z-40 md:hidden"
      role="dialog"
      aria-label="Install Binge app"
    >
      <div className="rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          {/* App icon */}
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600">
            <span className="text-base font-black text-white">B</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Add Binge to your home screen</p>
            <p className="text-[11px] text-white/40">Faster access, full-screen experience</p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Instructions */}
        <div className="px-4 pb-4">
          {platform === "ios" ? (
            <ol className="flex flex-col gap-2">
              <li className="flex items-center gap-2.5 text-[12px] text-white/55">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400">1</span>
                Tap the
                <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.07] px-1.5 py-0.5 font-medium text-white/80">
                  <Share className="h-3 w-3" /> Share
                </span>
                button in Safari
              </li>
              <li className="flex items-center gap-2.5 text-[12px] text-white/55">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400">2</span>
                Scroll down and tap
                <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.07] px-1.5 py-0.5 font-medium text-white/80">
                  <PlusSquare className="h-3 w-3" /> Add to Home Screen
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-[12px] text-white/55">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400">3</span>
                Tap <span className="font-semibold text-white/80">Add</span> — done
              </li>
            </ol>
          ) : (
            <button
              onClick={handleAndroidInstall}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-500 active:bg-blue-700 transition-colors"
            >
              Install App
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
