"use client"

import { usePathname, useSearchParams, useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check, Tv2, X } from "lucide-react"
import { STREAMING_SERVICES } from "@/lib/tmdb"

export default function StreamingFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Support multiple selected services via comma-separated param
  const raw = searchParams.get("streaming") ?? ""
  const selected = raw ? raw.split(",").map(Number) : []

  function toggle(id: number) {
    const next = selected.includes(id)
      ? selected.filter((s) => s !== id)
      : [...selected, id]
    const params = new URLSearchParams(searchParams.toString())
    if (next.length === 0) params.delete("streaming")
    else params.set("streaming", next.join(","))
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("streaming")
    router.push(`${pathname}?${params.toString()}`)
    setOpen(false)
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const label = selected.length === 0
    ? "All Services"
    : selected.length === 1
      ? STREAMING_SERVICES.find((s) => s.id === selected[0])?.name ?? "1 selected"
      : `${selected.length} services`

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
          selected.length > 0
            ? "border-blue-500 bg-blue-600/20 text-blue-300"
            : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
        }`}
      >
        <Tv2 className="h-4 w-4" />
        {label}
        {selected.length > 0 ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); clearAll() }}
            className="ml-1 rounded-full p-0.5 hover:bg-white/10"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-xl">
          <div className="p-1">
            {STREAMING_SERVICES.map((service) => {
              const active = selected.includes(service.id)
              return (
                <button
                  key={service.id}
                  onClick={() => toggle(service.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
                >
                  <div className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${active ? "bg-blue-600" : "border border-white/20"}`}>
                    {active && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className={active ? "text-white" : "text-white/60"}>{service.name}</span>
                </button>
              )
            })}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-white/5 p-1">
              <button
                onClick={clearAll}
                className="w-full rounded-lg px-3 py-2 text-center text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
