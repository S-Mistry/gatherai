"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import {
  Microphone,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VoiceStatus, type VoiceState } from "@/components/ui/voice-status"
import type { PublicInterviewConfig } from "@/lib/domain/types"

type ShellStatus =
  | "ready"
  | "requesting_mic"
  | "connecting"
  | "live"
  | "paused"
  | "fallback"
  | "complete"
  | "error"

interface InterviewShellProps {
  linkToken: string
  config: PublicInterviewConfig
}

type RealtimeHandle = {
  disconnect: () => Promise<void> | void
  mute?: (muted: boolean) => void
}

function buildBrowserInstructions(config: PublicInterviewConfig) {
  return [
    `You are the workshop discovery interviewer for ${config.projectName}.`,
    `Objective: ${config.objective}`,
    "Start with a short warm greeting and confirm the participant can hear you.",
    "Ask one primary question at a time.",
    "Stay warm, neutral, and concise.",
    "Summarize before moving to the next topic.",
  ].join(" ")
}

function extractClientSecretValue(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  if ("value" in payload && typeof payload.value === "string") {
    return payload.value
  }

  if (
    "client_secret" in payload &&
    payload.client_secret &&
    typeof payload.client_secret === "object" &&
    "value" in payload.client_secret &&
    typeof payload.client_secret.value === "string"
  ) {
    return payload.client_secret.value
  }

  return null
}

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}`
}

export function InterviewShell({ linkToken, config }: InterviewShellProps) {
  const [status, setStatus] = useState<ShellStatus>("ready")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [, setRecoveryToken] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [pending, startTransition] = useTransition()
  const realtimeSessionRef = useRef<RealtimeHandle | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      void realtimeSessionRef.current?.disconnect?.()
      micStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  useEffect(() => {
    if (status !== "live") return
    const id = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [status])

  async function handleStart() {
    setErrorMessage(null)
    setStatus("requesting_mic")

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStatus("error")
      setErrorMessage(
        "We need microphone access to talk. Open your browser settings to allow it, then try again."
      )
      return
    }

    setStatus("connecting")

    try {
      const sessionResponse = await fetch(`/api/public/links/${linkToken}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: {} }),
      })

      const sessionPayload = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(
          sessionPayload.error ?? "We couldn't start the interview. Please refresh and try again."
        )
      }

      setSessionId(sessionPayload.session.id)
      setRecoveryToken(sessionPayload.recoveryToken)

      const secretResponse = await fetch(
        `/api/public/sessions/${sessionPayload.session.id}/client-secret`,
        { method: "POST" }
      )

      const secretPayload = await secretResponse.json()
      const secret = extractClientSecretValue(secretPayload)

      if (!secretResponse.ok || !secret) {
        setStatus("fallback")
        setErrorMessage(
          secretPayload.error ??
            "We can't start a live voice session right now. Try refreshing the page — if it keeps happening, let the consultant know."
        )
        return
      }

      const realtime = await import("@openai/agents/realtime")
      const agent = new realtime.RealtimeAgent({
        name: "GatherAI Interviewer",
        instructions: buildBrowserInstructions(config),
      })
      const session = new realtime.RealtimeSession(agent)
      await session.connect({ apiKey: secret })

      realtimeSessionRef.current = session as unknown as RealtimeHandle
      setStatus("live")
    } catch (error) {
      setStatus("error")
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Your mic didn't connect. Check browser permissions and try again."
      )
    }
  }

  function handleTogglePause() {
    const handle = realtimeSessionRef.current
    if (!handle) return

    if (status === "live") {
      handle.mute?.(true)
      setStatus("paused")
    } else if (status === "paused") {
      handle.mute?.(false)
      setStatus("live")
    }
  }

  function handleComplete() {
    if (!sessionId) return

    startTransition(async () => {
      const response = await fetch(`/api/public/sessions/${sessionId}/complete`, {
        method: "POST",
      })
      const payload = await response.json()

      if (!response.ok) {
        setStatus("error")
        setErrorMessage(
          payload.error ?? "We couldn't wrap up the interview. Please refresh and try again."
        )
        return
      }

      void realtimeSessionRef.current?.disconnect?.()
      micStreamRef.current?.getTracks().forEach((track) => track.stop())
      setStatus("complete")
    })
  }

  if (status === "complete") {
    return <CompletionSurface />
  }

  const isLive = status === "live" || status === "paused"
  const voiceState: VoiceState =
    status === "live" ? "listening" : status === "paused" ? "idle" : "idle"

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="space-y-6">
        <CardHeader>
          <CardTitle className="text-3xl">{config.projectName}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            About {config.durationCapMinutes} minutes. One question at a time.
          </p>
        </CardHeader>
        <CardContent>
          {!isLive ? (
            <div className="rounded-[28px] border border-border/70 bg-background/80 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                What we&apos;d like to learn
              </p>
              <p className="mt-3 text-base leading-7 text-foreground">{config.objective}</p>
            </div>
          ) : null}

          {isLive ? (
            <LiveSurface
              voiceState={voiceState}
              elapsedSeconds={elapsedSeconds}
              durationCapMinutes={config.durationCapMinutes}
              paused={status === "paused"}
              onTogglePause={handleTogglePause}
              onComplete={handleComplete}
              completing={pending}
            />
          ) : (
            <PreStartSurface
              status={status}
              errorMessage={errorMessage}
              onStart={handleStart}
            />
          )}
        </CardContent>
      </Card>

      {!isLive ? (
        <Card className="space-y-6">
          <CardHeader>
            <CardTitle>A few things to know</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">How it works</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>One question at a time.</li>
                <li>Take as long as you want to answer.</li>
                <li>You can pause or end early — nothing is lost.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">How you&apos;re identified</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {config.anonymityMode === "anonymous"
                  ? "Fully anonymous — no name or role is attached to what you say."
                  : config.anonymityMode === "pseudonymous"
                    ? "By role only — you'll appear as a labeled stakeholder, not by name."
                    : "By name — the consultant will see who said what."}
              </p>
            </div>

            {config.metadataPrompts.length > 0 ? (
              <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold text-foreground">
                  A few quick questions first
                </p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {config.metadataPrompts.map((prompt) => (
                    <li key={prompt.id}>
                      {prompt.label}
                      {prompt.required ? "" : " (optional)"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function PreStartSurface({
  status,
  errorMessage,
  onStart,
}: {
  status: ShellStatus
  errorMessage: string | null
  onStart: () => void
}) {
  const helper =
    status === "requesting_mic"
      ? "Allow microphone access to begin."
      : status === "connecting"
        ? "Setting up your microphone…"
        : "Take a breath. Press start when you're ready."

  const showError = status === "error" || status === "fallback"

  return (
    <div className="space-y-4" aria-live="polite">
      <Button
        size="lg"
        onClick={onStart}
        disabled={status === "requesting_mic" || status === "connecting"}
        className="w-full sm:w-auto"
      >
        <Microphone className="size-4" />
        {status === "connecting" ? "Connecting…" : "Start when ready"}
      </Button>

      <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
        {showError ? (
          <WarningCircle className="mt-0.5 size-4 text-destructive" />
        ) : null}
        <p className={showError ? "text-foreground" : undefined}>
          {showError ? errorMessage : helper}
        </p>
      </div>
    </div>
  )
}

function LiveSurface({
  voiceState,
  elapsedSeconds,
  durationCapMinutes,
  paused,
  onTogglePause,
  onComplete,
  completing,
}: {
  voiceState: VoiceState
  elapsedSeconds: number
  durationCapMinutes: number
  paused: boolean
  onTogglePause: () => void
  onComplete: () => void
  completing: boolean
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <VoiceStatus state={voiceState} />
        <span
          className="text-sm tabular-nums text-muted-foreground"
          aria-label={`${formatMinutes(elapsedSeconds)} of roughly ${durationCapMinutes} minutes`}
        >
          {formatMinutes(elapsedSeconds)} / ~{durationCapMinutes} min
        </span>
      </div>

      <p className="text-base leading-7 text-muted-foreground">
        {paused ? "Paused. Press resume when you're ready." : "I'm listening. Take your time."}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="lg" onClick={onTogglePause}>
          {paused ? <PlayCircle className="size-4" /> : <PauseCircle className="size-4" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="secondary" size="lg" onClick={onComplete} disabled={completing}>
          I&apos;m done
        </Button>
      </div>
    </div>
  )
}

function CompletionSurface() {
  return (
    <Card className="text-center">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="rounded-full border border-primary/30 bg-primary/10 p-3 text-primary">
          <ShieldCheck className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            Thanks — that was genuinely useful.
          </h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            Your voice isn&apos;t saved. Only the transcript helps shape the workshop. You can
            close this tab.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
