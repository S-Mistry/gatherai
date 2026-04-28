import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Margin note — a Caveat note pinned to the right of a notebook card,
 * with a hand-drawn arrow pointing back into the body.
 *
 * Designed for the deep-interview notebook surface.
 * `top` controls vertical alignment to the conversation row being annotated.
 */
export function MarginNote({
  children,
  top = 280,
  rotate = 4,
  width = 220,
  className,
}: {
  children: ReactNode
  top?: number
  rotate?: number
  width?: number
  className?: string
}) {
  const style: CSSProperties = {
    position: "absolute",
    right: -56,
    top,
    width,
    transform: `rotate(${rotate}deg)`,
  }
  return (
    <div className={cn("font-hand", className)} style={style}>
      <div
        style={{
          fontSize: 22,
          color: "var(--clay)",
          lineHeight: 1.3,
        }}
      >
        {children}
      </div>
      <svg
        width={60}
        height={30}
        style={{ position: "absolute", left: -55, top: 10 }}
        aria-hidden
      >
        <path
          d="M 55 15 Q 30 5, 5 20"
          stroke="var(--clay)"
          strokeWidth={1.5}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 10 15 L 5 20 L 12 22"
          stroke="var(--clay)"
          strokeWidth={1.5}
          fill="none"
        />
      </svg>
    </div>
  )
}
