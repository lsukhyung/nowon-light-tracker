"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          // Track styling - thin and subtle
          "bg-slate-200 dark:bg-slate-700 relative grow overflow-hidden rounded-full",
          "data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            // Filled range - solid blue
            "bg-[#007AFF] dark:bg-[#0A84FF] absolute rounded-full",
            "data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={cn(
            // Thumb - circular knob
            "block h-6 w-6 rounded-full bg-white",
            // Border and shadow for depth
            "border border-slate-200 dark:border-slate-600",
            "shadow-[0_2px_4px_rgba(0,0,0,0.1)]",
            // No scale transitions to prevent "jumping" feel
            "transition-shadow duration-150 ease-out",
            // Focus/hover states - only shadow changes
            "hover:shadow-[0_2px_8px_rgba(0,122,255,0.3)]",
            "focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(0,122,255,0.3)]",
            // Cursor
            "cursor-grab active:cursor-grabbing",
            // Disabled
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
