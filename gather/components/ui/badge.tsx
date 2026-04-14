import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

const variants = {
  neutral: "border-border/70 bg-card/80 text-foreground",
  accent: "border-primary/20 bg-primary/12 text-primary",
  success: "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-300",
  danger: "border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-300",
} as const

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants
}

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
