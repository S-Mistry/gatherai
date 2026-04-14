import type { TextareaHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-4 focus:ring-primary/10 dark:bg-card/70",
        className
      )}
      {...props}
    />
  )
}
