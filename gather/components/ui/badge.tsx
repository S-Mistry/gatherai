import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

const variantClass = {
  neutral: "",
  solid: "solid",
  clay: "clay",
  sage: "sage",
  gold: "gold",
  rose: "rose",
  // legacy aliases — keep older callsites compiling and visually sensible.
  accent: "clay",
  success: "sage",
  warning: "gold",
  danger: "rose",
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variantClass
  dot?: boolean
}

export function Badge({
  className,
  variant = "neutral",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn("chip", variantClass[variant], className)} {...props}>
      {dot && <span className="dot" />}
      {children}
    </span>
  )
}
