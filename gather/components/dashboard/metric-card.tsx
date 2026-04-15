import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  label: string
  value: string
  hint: string
  accent?: string
  href?: string
  ariaLabel?: string
}

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
      <CardHeader>
        <CardDescription className="text-xs tracking-[0.24em] uppercase">
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-sm leading-6 text-muted-foreground">{hint}</p>
        {accent ? (
          <p className="text-sm font-medium text-primary">{accent}</p>
        ) : null}
      </CardContent>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel ?? `${label}: ${value}`}
        className={cn(
          "panel block cursor-pointer space-y-3 transition",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
          "hover:border-border/70 hover:bg-card/80 hover:text-foreground"
        )}
      >
        {content}
      </Link>
    )
  }

  return <Card className="space-y-3">{content}</Card>
}
