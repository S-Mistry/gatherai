import type { HTMLAttributes } from "react"

import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  flat?: boolean
  lined?: boolean
  redLine?: boolean
}

export function Card({ className, flat, lined, redLine, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "card",
        flat && "flat",
        lined && "lined",
        redLine && "red-line",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-serif text-2xl font-normal tracking-tight text-[var(--ink)]",
        className
      )}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("font-sans text-[13px] leading-6 text-[var(--ink-2)]", className)}
      {...props}
    />
  )
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...props} />
}
