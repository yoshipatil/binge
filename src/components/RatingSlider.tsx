"use client"

import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { getTier } from "@/lib/tiers"

interface RatingSliderProps {
  value: number
  onChange: (value: number) => void
}

export default function RatingSlider({ value, onChange }: RatingSliderProps) {
  const tier = getTier(value)

  return (
    <div className="flex flex-col gap-4">
      {/* Big score display */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-5xl font-bold tabular-nums">{value.toFixed(1)}</span>
        <Badge className={`px-4 py-1 text-sm font-semibold ${tier.color} ${tier.text} border-0`}>
          {tier.label}
        </Badge>
      </div>

      {/* Slider */}
      <div className="px-2">
        <Slider
          min={1}
          max={10}
          step={0.1}
          value={[value]}
          onValueChange={([v]) => onChange(Math.round(v * 10) / 10)}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground">
          <span>1.0</span>
          <span>5.0</span>
          <span>10.0</span>
        </div>
      </div>
    </div>
  )
}
