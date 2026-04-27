import type { ComponentType, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-8 py-14 text-center",
        className
      )}
      style={{ border: "1.5px dashed var(--line)", borderRadius: 8 }}
    >
      {Icon ? (
        <div
          className="grid place-items-center"
          style={{
            width: 44,
            height: 44,
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            color: "var(--ink-3)",
          }}
        >
          <Icon className="size-5" />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <h3 className="font-serif text-2xl font-normal text-[var(--ink)]">
          {title}
        </h3>
        {description ? (
          <p className="font-sans max-w-md text-sm leading-6 text-[var(--ink-2)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
