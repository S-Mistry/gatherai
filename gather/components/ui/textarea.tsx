import type { TextareaHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full bg-transparent border-0 border-b-[1.5px] border-dashed border-[var(--line)] font-serif text-xl text-[var(--ink)] px-1 py-2.5 outline-none placeholder:text-[var(--ink-4)] focus:border-solid focus:border-[var(--clay)] transition-colors resize-y",
        className
      )}
      {...props}
    />
  )
}
