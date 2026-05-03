"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      style={{
        height: '24px',
        width: '44px',
        minHeight: '24px',
        minWidth: '44px',
        maxHeight: '24px',
      }}
      className={cn(
        // 타원형 트랙
        "peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-out",
        // Background colors - iOS 표준 색상
        "data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-[#E5E5EA]",
        "dark:data-[state=checked]:bg-[#30D158] dark:data-[state=unchecked]:bg-[#3A3A3C]",
        // Focus states
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/40 focus-visible:ring-offset-1",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        style={{
          height: '20px',
          width: '20px',
          minHeight: '20px',
          minWidth: '20px',
        }}
        className={cn(
          // 원형 thumb
          "pointer-events-none block rounded-full bg-white",
          // iOS 스타일 그림자
          "shadow-[0_1px_3px_rgba(0,0,0,0.16),0_1px_2px_rgba(0,0,0,0.24)]",
          // 부드러운 전환
          "transition-transform duration-200 ease-out",
          // Position states (44 - 20 - 4 = 20px 이동)
          "data-[state=unchecked]:translate-x-[2px] data-[state=checked]:translate-x-[22px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
