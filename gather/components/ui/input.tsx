import type { InputHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full bg-transparent border-0 border-b-[1.5px] border-dashed border-[var(--line)] font-serif text-xl text-[var(--ink)] px-1 py-2.5 outline-none placeholder:text-[var(--ink-4)] focus:border-solid focus:border-[var(--clay)] transition-colors",
        className
      )}
      {...props}
    />
  )
}
