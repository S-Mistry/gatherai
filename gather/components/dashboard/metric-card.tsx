import Link from "next/link"

import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  hint: string
  accent?: string
  href?: string
  ariaLabel?: string
}

const tileBase = cn(
  "stack gap-2 rounded-2xl border border-border/70 bg-background/70 p-4",
  "transition-colors"
)

export function MetricCard({
  label,
  value,
  hint,
  accent,
  href,
  ariaLabel,
}: MetricCardProps) {
  const content = (
    <>
      <p className="eyebrow-sm">{label}</p>
      <p className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
      {accent ? (
        <p className="text-xs font-medium leading-5 text-primary">{accent}</p>
      ) : null}
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel ?? `${label}: ${value}`}
        className={cn(
          tileBase,
          "focus-ring hover:border-primary/40 hover:bg-primary/8"
        )}
      >
        {content}
      </Link>
    )
  }

  return <div className={tileBase}>{content}</div>
}
