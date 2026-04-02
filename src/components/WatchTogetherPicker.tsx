"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Users, Check } from "lucide-react"

interface Friend {
  id: string
  name: string | null
  username: string | null
  image: string | null
  compatibility: number | null
}

interface WatchTogetherPickerProps {
  friends: Friend[]
}

function AvatarBubble({
  image,
  name,
  size = 32,
}: {
  image: string | null
  name: string | null
  size?: number
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={name ?? "Friend"}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-black"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-blue-500/30 flex items-center justify-center ring-2 ring-black flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        className="font-bold text-blue-300"
        style={{ fontSize: size * 0.4 }}
      >
        {(name ?? "?")[0].toUpperCase()}
      </span>
    </div>
  )
}

function CompatibilityBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const color =
    score >= 80
      ? "bg-blue-500/15 text-blue-400"
      : score >= 65
      ? "bg-emerald-500/15 text-emerald-400"
      : score >= 50
      ? "bg-amber-500/15 text-amber-400"
      : "bg-white/5 text-white/35"
  return (
    <span className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${color}`}>
      {score}%
    </span>
  )
}

const MAX_FRIENDS = 5

export default function WatchTogetherPicker({ friends }: WatchTogetherPickerProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_FRIENDS) {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectedFriends = friends.filter((f) => selected.has(f.id))
  const atMax = selected.size >= MAX_FRIENDS

  function handleFind() {
    if (selected.size === 0) return
    const ids = [...selected].join(",")
    router.push(`/watch-together?friendIds=${ids}`)
  }

  return (
    // h-dvh + overflow-hidden = proper app-shell. flex children control their own height.
    // No sticky needed — header/footer use flex-shrink-0, list uses flex-1 overflow-y-auto min-h-0.
    <div className="flex h-dvh flex-col overflow-hidden bg-black">

      {/* ── Header ── */}
      <header
        className="flex-shrink-0 flex items-center gap-3 border-b border-white/[0.06] bg-black px-4 py-3"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white/60 hover:bg-white/[0.08] hover:text-white active:scale-95 transition-all duration-150"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-black tracking-tight">Watch Together</h1>
          <p className="text-[11px] text-white/40 mt-0.5">
            Pick up to 5 friends to find what you&apos;d all love
          </p>
        </div>
      </header>

      {/* ── Selected AvatarStack strip (appears when ≥1 selected) ── */}
      {selected.size > 0 && (
        <div className="flex-shrink-0 flex items-center gap-3 border-b border-white/[0.06] bg-black/95 px-4 py-3">
          <div className="flex items-center">
            {selectedFriends.map((f, i) => (
              <div
                key={f.id}
                className="relative"
                style={{ marginLeft: i > 0 ? -8 : 0, zIndex: selectedFriends.length - i }}
              >
                <AvatarBubble image={f.image} name={f.name} size={32} />
              </div>
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm text-white/70">
              {selectedFriends.map((f) => f.name ?? "Friend").join(", ")}
            </p>
          </div>
          {atMax && (
            <span className="flex-shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-400">
              Max 5
            </span>
          )}
        </div>
      )}

      {/* ── Friend list — min-h-0 is critical: prevents flex child from ignoring overflow ── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
        <div className="flex flex-col gap-1">
          {friends.map((friend) => {
            const isSelected = selected.has(friend.id)
            const isDisabled = atMax && !isSelected
            return (
              <button
                key={friend.id}
                onClick={() => !isDisabled && toggle(friend.id)}
                disabled={isDisabled}
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150",
                  "min-h-[56px]",
                  isSelected
                    ? "bg-blue-600/15 ring-1 ring-blue-500/30"
                    : "bg-white/[0.03] hover:bg-white/[0.06] active:bg-white/[0.08]",
                  isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
                aria-pressed={isSelected}
              >
                <div className="flex-shrink-0">
                  <AvatarBubble image={friend.image} name={friend.name} size={44} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-white/90">
                    {friend.name ?? "Binge User"}
                  </p>
                  {friend.username && (
                    <p className="text-[11px] text-white/35">@{friend.username}</p>
                  )}
                </div>

                <CompatibilityBadge score={friend.compatibility} />

                <div
                  className={[
                    "ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150",
                    isSelected
                      ? "border-blue-500 bg-blue-600"
                      : "border-white/15 bg-transparent",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Empty following state — inside scroll area so it centers nicely */}
        {friends.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-24 text-center px-8">
            <Users className="h-10 w-10 text-white/15" />
            <p className="text-sm text-white/40">Follow some friends first to watch together.</p>
          </div>
        )}
      </div>

      {/* ── Find Movies CTA ── */}
      <div
        className="flex-shrink-0 border-t border-white/[0.06] bg-black px-4 py-4"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={handleFind}
          disabled={selected.size === 0}
          className={[
            "flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl text-base font-black tracking-tight transition-all duration-150",
            selected.size > 0
              ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]"
              : "bg-white/5 text-white/25 cursor-not-allowed",
          ].join(" ")}
        >
          {selected.size === 0 ? (
            "Select at least one friend"
          ) : (
            <>
              <Users className="h-5 w-5" />
              Find Movies
              {selected.size > 1 && (
                <span className="ml-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                  {selected.size}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
