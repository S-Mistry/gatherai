"use client"

import { useCallback, useState } from "react"
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
import type { MicSupport } from "@/lib/participant/mic-support"
import { getProjectTypePreset } from "@/lib/project-types"
import {
  PARTICIPANT_INTERVIEWER_NAME,
} from "@/lib/openai/realtime-config"
import type { ProjectType, PublicInterviewConfig } from "@/lib/domain/types"

export type InterviewShellStatus =
  | "ready"
  | "requesting_mic"
  | "connecting"
  | "live"
  | "paused"
  | "fallback"
  | "complete"
  | "error"

function formatMinutes(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}`
}

export function InterviewObjectivePanel({ objective }: { objective: string }) {
  return (
    <div className="rounded-[28px] border border-border/70 bg-background/80 p-5">
      <p className="text-sm tracking-[0.24em] text-muted-foreground uppercase">
        What we&apos;d like to learn
      </p>
      <p className="mt-3 text-base leading-7 text-foreground">{objective}</p>
    </div>
  )
}

export function InterviewInfoSidebar({
  config,
}: {
  config: PublicInterviewConfig
}) {
  const preset = getProjectTypePreset(config.projectType)

  return (
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
            <li>You can pause or end early - nothing is lost.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <p className="text-sm font-semibold text-foreground">
            How you&apos;re identified
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {config.anonymityMode === "anonymous"
              ? "Fully anonymous - no name or role is attached to what you say."
              : config.anonymityMode === "pseudonymous"
                ? `By label only - you'll appear as a labeled ${preset.anonymousRespondentLabel.toLowerCase()}, not by name.`
                : "By name - the consultant will see who said what."}
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
  )
}

export function PreStartSurface({
  status,
  errorMessage,
  onStart,
  micSupport,
  onRecheckMicSupport,
}: {
  status: InterviewShellStatus
  errorMessage: string | null
  onStart: () => void
  micSupport: MicSupport | null
  onRecheckMicSupport: () => void | Promise<void>
}) {
  const blocked = micSupport && micSupport.kind !== "ready" ? micSupport : null

  if (blocked) {
    const headline =
      blocked.kind === "insecure"
        ? "This page isn't secure"
        : blocked.kind === "denied"
          ? "Microphone access is blocked"
          : blocked.reason === "brave-shields"
            ? "Brave Shields is blocking the microphone"
            : blocked.reason === "webview"
              ? "Open this link in Safari or Chrome"
              : "Your browser can't access the microphone"

    return (
      <div className="space-y-4" aria-live="polite">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-2">
            <WarningCircle className="mt-0.5 size-4 text-destructive" />
            <div className="space-y-2">
              <p className="text-base font-semibold text-foreground">
                {headline}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {blocked.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={() => void onRecheckMicSupport()}
            className="w-full sm:w-auto"
          >
            I fixed it - try again
          </Button>
          <CopyLinkButton />
        </div>
      </div>
    )
  }

  const helper =
    status === "requesting_mic"
      ? "Allow microphone access to begin."
      : status === "connecting"
        ? "Setting up your microphone..."
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
        {status === "connecting" ? "Connecting..." : "Start when ready"}
      </Button>

      <div className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
        {showError ? (
          <WarningCircle className="mt-0.5 size-4 text-destructive" />
        ) : null}
        <p className={showError ? "text-foreground" : undefined}>
          {showError ? errorMessage : helper}
        </p>
      </div>

      {showError ? (
        <Button
          size="lg"
          variant="outline"
          onClick={onStart}
          className="w-full sm:w-auto"
        >
          Try again
        </Button>
      ) : null}
    </div>
  )
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (typeof window === "undefined") return
    const url = window.location.href
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = url
        textarea.setAttribute("readonly", "")
        textarea.style.position = "fixed"
        textarea.style.opacity = "0"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can reject in some mobile contexts. Fall back silently.
    }
  }, [])

  return (
    <Button
      size="lg"
      variant="secondary"
      onClick={() => void handleCopy()}
      className="w-full sm:w-auto"
    >
      {copied ? "Link copied" : "Copy link"}
    </Button>
  )
}

export function LiveSurface({
  voiceState,
  elapsedSeconds,
  durationTargetLabel,
  durationAriaDescription,
  interviewStarted,
  paused,
  onTogglePause,
  onComplete,
}: {
  voiceState: VoiceState
  elapsedSeconds: number
  durationTargetLabel: string
  durationAriaDescription: string
  interviewStarted: boolean
  paused: boolean
  onTogglePause: () => void
  onComplete: () => void
}) {
  const statusLabel = paused
    ? `${PARTICIPANT_INTERVIEWER_NAME} is paused`
    : voiceState === "idle"
      ? interviewStarted
        ? `${PARTICIPANT_INTERVIEWER_NAME} is waiting`
        : `${PARTICIPANT_INTERVIEWER_NAME} is introducing the interview`
      : `${PARTICIPANT_INTERVIEWER_NAME} is ${voiceState}`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <VoiceStatus state={voiceState} label={statusLabel} />
        <span
          className="text-sm text-muted-foreground tabular-nums"
          aria-label={`${formatMinutes(elapsedSeconds)} minutes elapsed; ${durationAriaDescription}`}
        >
          {formatMinutes(elapsedSeconds)} / {durationTargetLabel}
        </span>
      </div>

      <p className="text-base leading-7 text-muted-foreground">
        {paused
          ? "Paused. Press resume when you're ready."
          : interviewStarted
            ? "I'm listening. Take your time."
            : `${PARTICIPANT_INTERVIEWER_NAME} will introduce herself first. Say ready when you'd like to begin.`}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="lg" onClick={onTogglePause}>
          {paused ? (
            <PlayCircle className="size-4" />
          ) : (
            <PauseCircle className="size-4" />
          )}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="secondary" size="lg" onClick={onComplete}>
          I&apos;m done
        </Button>
      </div>
    </div>
  )
}

export function CompletionSurface({
  projectType,
}: {
  projectType: ProjectType
}) {
  const preset = getProjectTypePreset(projectType)

  return (
    <Card className="text-center">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="rounded-full border border-primary/30 bg-primary/10 p-3 text-primary">
          <ShieldCheck className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-foreground">
            {preset.completionTitle}
          </h2>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {preset.completionDescription} You can close this tab.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
