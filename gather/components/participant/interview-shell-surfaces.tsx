"use client"

import { useCallback, useState } from "react"
import {
  PauseCircle,
  PlayCircle,
  WarningCircle,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Stamp, WaveBars } from "@/components/ui/ornaments"
import { type VoiceState } from "@/components/ui/voice-status"
import type { MicSupport } from "@/lib/participant/mic-support"
import { getProjectTypePreset } from "@/lib/project-types"
import { PARTICIPANT_INTERVIEWER_NAME } from "@/lib/openai/realtime-config"
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
    <div
      style={{
        border: "1px dashed var(--line)",
        borderRadius: 8,
        padding: "18px 22px",
        background: "var(--card-2)",
      }}
    >
      <span className="eyebrow">What we&apos;d like to learn</span>
      <p
        className="font-serif mt-3"
        style={{ fontSize: 18, lineHeight: 1.5, color: "var(--ink)", margin: 0 }}
      >
        {objective}
      </p>
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
    <div className="card flat" style={{ padding: "26px 28px" }}>
      <div className="font-hand text-[24px] text-[var(--clay)]">
        a few things to know —
      </div>

      <div className="mt-5 space-y-4">
        <InfoBlock title="how it works">
          <ul
            className="font-sans"
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "var(--ink-2)",
            }}
          >
            <li>One question at a time.</li>
            <li>Take as long as you want to answer.</li>
            <li>You can pause or end early — nothing is lost.</li>
          </ul>
        </InfoBlock>

        <InfoBlock title="how you're identified">
          <p
            className="font-sans m-0"
            style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--ink-2)" }}
          >
            {config.anonymityMode === "anonymous"
              ? "Fully anonymous — no name or role attached to what you say."
              : config.anonymityMode === "pseudonymous"
                ? `By label only — you'll appear as a labeled ${preset.anonymousRespondentLabel.toLowerCase()}, not by name.`
                : "By name — the consultant will see who said what."}
          </p>
        </InfoBlock>

        {config.metadataPrompts.length > 0 ? (
          <InfoBlock title="a few quick questions first">
            <ul
              className="font-sans"
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "var(--ink-2)",
              }}
            >
              {config.metadataPrompts.map((prompt) => (
                <li key={prompt.id}>
                  {prompt.label}
                  {prompt.required ? "" : " (optional)"}
                </li>
              ))}
            </ul>
          </InfoBlock>
        ) : null}
      </div>
    </div>
  )
}

function InfoBlock({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        border: "1px dashed var(--line)",
        borderRadius: 6,
        padding: "14px 18px",
        background: "var(--card-2)",
      }}
    >
      <div
        className="font-hand mb-2"
        style={{ fontSize: 18, color: "var(--clay)" }}
      >
        {title}
      </div>
      {children}
    </div>
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
        <div
          style={{
            border: "1px solid var(--rose)",
            background: "var(--rose-soft)",
            borderRadius: 6,
            padding: "16px 18px",
          }}
        >
          <div className="flex items-start gap-2">
            <WarningCircle className="mt-0.5 size-4 text-[var(--rose)]" />
            <div className="space-y-2">
              <p className="font-serif text-lg text-[var(--ink)] m-0">
                {headline}
              </p>
              <p className="font-sans text-sm leading-6 text-[var(--ink-2)] m-0">
                {blocked.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            variant="ghost"
            onClick={() => void onRecheckMicSupport()}
          >
            I fixed it — try again
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
        ? "Setting up your microphone…"
        : "Take a breath. Press start when you're ready."

  const showError = status === "error" || status === "fallback"

  return (
    <div className="space-y-4" aria-live="polite">
      <Button
        variant="clay"
        size="lg"
        onClick={onStart}
        disabled={status === "requesting_mic" || status === "connecting"}
      >
        {status === "connecting" ? "Connecting…" : "Start when ready →"}
      </Button>

      <div
        className={
          "font-sans flex items-start gap-2 text-sm leading-6 " +
          (showError ? "text-[var(--ink)]" : "text-[var(--ink-3)]")
        }
      >
        {showError ? (
          <WarningCircle className="mt-0.5 size-4 text-[var(--rose)]" />
        ) : null}
        <p className="m-0">{showError ? errorMessage : helper}</p>
      </div>

      {showError ? (
        <Button size="lg" variant="ghost" onClick={onStart}>
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
    <Button size="lg" variant="ghost" onClick={() => void handleCopy()}>
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
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <WaveBars count={20} height={40} />
          <span
            className="font-serif"
            style={{
              fontSize: 18,
              color: "var(--ink-2)",
              fontStyle: "italic",
            }}
          >
            {statusLabel}
          </span>
        </div>
        <span
          className="font-mono text-[12px] text-[var(--ink-3)]"
          aria-label={`${formatMinutes(elapsedSeconds)} minutes elapsed; ${durationAriaDescription}`}
        >
          {formatMinutes(elapsedSeconds)} / {durationTargetLabel}
        </span>
      </div>

      <p
        className="font-serif"
        style={{
          fontSize: 18,
          lineHeight: 1.6,
          color: "var(--ink-2)",
          margin: 0,
        }}
      >
        {paused
          ? "Paused. Press resume when you're ready."
          : interviewStarted
            ? "I'm listening. Take your time."
            : `${PARTICIPANT_INTERVIEWER_NAME} will introduce herself first. Say ready when you'd like to begin.`}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button variant="ghost" size="lg" onClick={onTogglePause}>
          {paused ? (
            <PlayCircle className="size-4" />
          ) : (
            <PauseCircle className="size-4" />
          )}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button variant="clay" size="lg" onClick={onComplete}>
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
    <div className="card flat text-center" style={{ padding: "60px 40px" }}>
      <div className="mb-6">
        <Stamp variant="sage">received · thank you</Stamp>
      </div>
      <h2
        className="font-serif"
        style={{
          fontSize: 56,
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          margin: "0 0 16px",
        }}
      >
        {preset.completionTitle}
      </h2>
      <p
        className="font-serif"
        style={{
          fontSize: 19,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          margin: "0 auto 24px",
          maxWidth: 480,
        }}
      >
        {preset.completionDescription} You can close this tab.
      </p>
    </div>
  )
}
