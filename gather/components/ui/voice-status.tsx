"use client"

import { cn } from "@/lib/utils"

export type VoiceState = "idle" | "listening" | "thinking" | "speaking"

interface VoiceStatusProps {
  state: VoiceState
  className?: string
}

const LABELS: Record<VoiceState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking",
}

export function VoiceStatus({ state, className }: VoiceStatusProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={LABELS[state]}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground",
        className
      )}
    >
      <Indicator state={state} />
      <span>{LABELS[state]}</span>
    </div>
  )
}

function Indicator({ state }: { state: VoiceState }) {
  if (state === "listening") {
    return (
      <span
        aria-hidden
        className="size-2 animate-pulse rounded-full bg-primary motion-reduce:animate-none"
      />
    )
  }
  if (state === "thinking") {
    return (
      <span aria-hidden className="flex items-center gap-0.5">
        <span className="size-1 animate-bounce rounded-full bg-primary [animation-delay:-200ms] motion-reduce:animate-none" />
        <span className="size-1 animate-bounce rounded-full bg-primary [animation-delay:-100ms] motion-reduce:animate-none" />
        <span className="size-1 animate-bounce rounded-full bg-primary motion-reduce:animate-none" />
      </span>
    )
  }
  if (state === "speaking") {
    return (
      <span aria-hidden className="flex h-3 items-end gap-0.5">
        <span className="w-0.5 animate-pulse rounded-full bg-primary h-2 [animation-delay:-150ms] motion-reduce:animate-none" />
        <span className="w-0.5 animate-pulse rounded-full bg-primary h-3 motion-reduce:animate-none" />
        <span className="w-0.5 animate-pulse rounded-full bg-primary h-1.5 [animation-delay:-300ms] motion-reduce:animate-none" />
      </span>
    )
  }
  return <span aria-hidden className="size-2 rounded-full bg-muted-foreground/50" />
}
