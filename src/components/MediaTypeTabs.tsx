"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MediaType } from "@/types"

const tabs: { value: MediaType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV Shows" },
  { value: "documentary", label: "Documentaries" },
]

interface MediaTypeTabsProps {
  defaultValue?: MediaType | "all"
}

export default function MediaTypeTabs({ defaultValue = "all" }: MediaTypeTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = (searchParams.get("type") ?? defaultValue) as MediaType | "all"

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("type")
    } else {
      params.set("type", value)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <Tabs value={current} onValueChange={handleChange}>
      <TabsList className="h-11">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="px-3 text-sm min-h-[44px]">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
