"use client"

import { cn } from "@/lib/utils"

export type VoiceState = "idle" | "listening" | "thinking" | "speaking"

interface VoiceStatusProps {
  state: VoiceState
  label?: string
  className?: string
}

const LABELS: Record<VoiceState, string> = {
  idle: "Mia is waiting",
  listening: "Mia is listening",
  thinking: "Mia is thinking",
  speaking: "Mia is speaking",
}

export function VoiceStatus({ state, label, className }: VoiceStatusProps) {
  const resolvedLabel = label ?? LABELS[state]

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={resolvedLabel}
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-border/70 bg-background/70 px-3.5 py-2 text-xs font-medium text-foreground",
        className
      )}
    >
      <Waveform state={state} />
      <span>{resolvedLabel}</span>
    </div>
  )
}

const WAVE_LEVELS: Record<VoiceState, number[]> = {
  idle: [30, 48, 36, 54, 32],
  listening: [48, 76, 60, 82, 54],
  thinking: [28, 52, 72, 52, 28],
  speaking: [62, 92, 72, 100, 60],
}

const WAVE_TONES: Record<VoiceState, string> = {
  idle: "bg-[var(--ink-4)]",
  listening: "bg-primary",
  thinking: "bg-[var(--gold)]",
  speaking: "bg-[var(--sage)]",
}

function Waveform({ state }: { state: VoiceState }) {
  const shouldAnimate = state !== "idle"

  return (
    <span
      aria-hidden
      className="inline-flex h-5 items-end gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1"
    >
      {WAVE_LEVELS[state].map((height, index) => (
        <span
          key={`${state}-${index}`}
          className={cn(
            "block w-1 rounded-full transition-all duration-300",
            WAVE_TONES[state],
            shouldAnimate && "animate-pulse motion-reduce:animate-none"
          )}
          style={{
            height: `${height}%`,
            animationDelay: `${index * 120}ms`,
            animationDuration:
              state === "speaking"
                ? "700ms"
                : state === "thinking"
                  ? "900ms"
                  : "1200ms",
          }}
        />
      ))}
    </span>
  )
}
