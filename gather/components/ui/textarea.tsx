import { forwardRef, type TextareaHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full bg-transparent border-0 border-b-[1.5px] border-dashed border-[var(--line)] font-serif text-xl text-[var(--ink)] px-1 py-2.5 outline-none placeholder:text-[var(--ink-4)] focus:border-solid focus:border-[var(--clay)] transition-colors resize-y",
        className
      )}
      {...props}
    />
  )
})
