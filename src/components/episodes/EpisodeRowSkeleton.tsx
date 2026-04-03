"use client"

import { Skeleton } from "@/components/ui/skeleton"

export default function EpisodeRowSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Skeleton className="h-[54px] w-[96px] shrink-0 rounded-md bg-white/[0.06]" />
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <Skeleton className="h-3 w-3/4 rounded bg-white/[0.06]" />
        <Skeleton className="h-2.5 w-1/2 rounded bg-white/[0.06]" />
      </div>
      <Skeleton className="h-5 w-5 shrink-0 self-center rounded-full bg-white/[0.06]" />
    </div>
  )
}
