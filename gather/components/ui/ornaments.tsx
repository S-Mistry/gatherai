"use client"

import type { CSSProperties, HTMLAttributes, ReactNode } from "react"
import { useMemo } from "react"

import { cn } from "@/lib/utils"

type Tint = "yellow" | "green" | "rose"

export function Tape({
  tint = "yellow",
  className,
  style,
}: {
  tint?: Tint
  className?: string
  style?: CSSProperties
}) {
  return (
    <span
      className={cn(
        "tape",
        tint === "green" && "green",
        tint === "rose" && "rose",
        className
      )}
      style={style}
      aria-hidden
    />
  )
}

export function Stamp({
  variant = "stamp",
  rotate,
  children,
  className,
}: {
  variant?: "stamp" | "sage" | "ink"
  rotate?: number
  children: ReactNode
  className?: string
}) {
  const style =
    rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : undefined
  return (
    <span
      className={cn(
        "stamp",
        variant === "sage" && "sage",
        variant === "ink" && "ink",
        className
      )}
      style={style}
    >
      {children}
    </span>
  )
}

export function Pin({
  tint = "stamp",
  className,
}: {
  tint?: "stamp" | "sage" | "gold" | "clay"
  className?: string
}) {
  return (
    <span
      className={cn(
        "pin",
        tint === "sage" && "sage",
        tint === "gold" && "gold",
        tint === "clay" && "clay",
        className
      )}
      aria-hidden
    />
  )
}

export function Scribble({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("scribble", className)} {...props}>
      {children}
    </span>
  )
}

export function WaveBars({
  count = 24,
  height = 56,
  className,
  style,
}: {
  count?: number
  height?: number
  className?: string
  style?: CSSProperties
}) {
  const delays = useMemo(
    () => Array.from({ length: count }, (_, index) => ((index * 37) % 23) / 20),
    [count]
  )
  return (
    <span
      className={cn("wave-bars", className)}
      style={{ height, ...style }}
      aria-hidden
    >
      {delays.map((d, i) => (
        <span
          key={i}
          className="bar"
          style={{
            animationDelay: `${d}s`,
            animationDuration: `${0.85 + (i % 5) * 0.13}s`,
          }}
        />
      ))}
    </span>
  )
}

export function MicRing({
  active = true,
  onClick,
  className,
  children,
  ariaLabel,
}: {
  active?: boolean
  onClick?: () => void
  className?: string
  children?: ReactNode
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      className={cn("mic-ring", className)}
      style={{ animationPlayState: active ? "running" : "paused" }}
      onClick={onClick}
      aria-label={ariaLabel ?? (active ? "Pause recording" : "Start recording")}
    >
      {children ?? (
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="3" width="6" height="12" rx="3" fill="var(--card)" />
          <path
            d="M5 11a7 7 0 0 0 14 0"
            stroke="var(--card)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 18v3"
            stroke="var(--card)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}

export function Spectrogram({
  frequency,
  total,
  color = "var(--clay)",
  className,
}: {
  frequency: number
  total: number
  color?: string
  className?: string
}) {
  return (
    <span className={cn("spectro", className)} aria-hidden>
      {Array.from({ length: total }).map((_, j) => {
        const on = j < frequency
        const h = on ? 8 + ((j * 41) % 20) : 4
        return (
          <span
            key={j}
            className={cn("seg", on && "on")}
            style={{ height: h, background: on ? color : "var(--line)" }}
          />
        )
      })}
    </span>
  )
}

export function StickyNote({
  tint = "cream",
  rotate,
  className,
  style,
  children,
}: {
  tint?: "cream" | "peach" | "sage" | "lilac"
  rotate?: number
  className?: string
  style?: CSSProperties
  children: ReactNode
}) {
  return (
    <div
      className={cn("sticky", tint !== "cream" && tint, className)}
      style={{
        ...(rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}
