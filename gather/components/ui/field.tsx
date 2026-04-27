import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

export function Field({
  label,
  htmlFor,
  hint,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
}) {
  return (
    <div className={cn("field", className)} {...props}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint && (
        <span className="font-sans text-xs text-[var(--ink-3)]">{hint}</span>
      )}
    </div>
  )
}
