"use client"

import { useCallback, useState } from "react"
import { WarningCircle } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { MarginNote } from "@/components/ui/margin-note"
import { Tape, WaveBars } from "@/components/ui/ornaments"
import { type VoiceState } from "@/components/ui/voice-status"
import type { MicSupport } from "@/lib/participant/mic-support"
import { getProjectTypePreset } from "@/lib/project-types"
import { PARTICIPANT_INTERVIEWER_NAME } from "@/lib/openai/realtime-config"
import type { PublicInterviewConfig, QuestionDefinition } from "@/lib/domain/types"
import type { TranscriptPayloadSegment } from "@/lib/participant/realtime-history"
import { Completion } from "./completion"

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

// ────────────────────────────────────────────────────────
// NotebookCard — the design's `card lined red-line` with two
// tapes, scribble Q heading, transcript rows, inline live row.
// ────────────────────────────────────────────────────────

export function NotebookCard({
  respondentLabel,
  activeQuestion,
  questionIndex,
  totalQuestions,
  segments,
  voiceState,
  paused,
  showLiveRow,
  livePartial,
  marginNote,
  preStart,
}: {
  respondentLabel: string
  activeQuestion: string
  questionIndex: number
  totalQuestions: number
  segments: TranscriptPayloadSegment[]
  voiceState: VoiceState
  paused: boolean
  showLiveRow: boolean
  livePartial?: string | null
  marginNote?: { top: number; text: React.ReactNode } | null
  preStart?: React.ReactNode
}) {
  return (
    <div
      className="card lined red-line"
      style={{
        padding: "38px 44px 44px 74px",
        minHeight: 740,
        position: "relative",
      }}
    >
      <Tape style={{ top: -11, left: 60, transform: "rotate(-3deg)" }} />
      <Tape
        tint="green"
        style={{ top: -9, right: 80, transform: "rotate(4deg)" }}
      />

      <div
        className="font-hand inline-block"
        style={{
          fontSize: 28,
          color: "var(--clay)",
          transform: "rotate(-1.5deg)",
          marginBottom: 6,
        }}
      >
        conversation with {respondentLabel.toLowerCase()} —
      </div>
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "baseline",
          marginBottom: 28,
        }}
      >
        <span
          className="font-mono"
          style={{ fontSize: 11, color: "var(--ink-3)" }}
        >
          Q{questionIndex} / {totalQuestions}
        </span>
        <h2
          className="font-serif"
          style={{ fontSize: 34, lineHeight: 1.15, margin: 0, fontWeight: 400 }}
        >
          <span className="scribble">{activeQuestion}</span>
        </h2>
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        {segments.map((segment, i) => {
          const isParticipant = segment.speaker === "participant"
          return (
            <div
              key={segment.sourceItemId}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr",
                gap: 16,
                padding: "10px 0",
              }}
            >
              <div
                className="font-hand"
                style={{
                  fontSize: 20,
                  color: isParticipant ? "var(--clay)" : "var(--ink-3)",
                  transform: `rotate(${i % 2 ? -2 : 1}deg)`,
                }}
              >
                {isParticipant ? "you" : "gather"} →
              </div>
              <div
                className="font-serif"
                style={{ fontSize: 21, lineHeight: 1.5 }}
              >
                {segment.text}
              </div>
            </div>
          )
        })}

        {showLiveRow ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "90px 1fr",
              gap: 16,
              padding: "14px 0 6px",
            }}
          >
            <div
              className="font-hand"
              style={{
                fontSize: 20,
                color: "var(--clay)",
                transform: "rotate(-1deg)",
              }}
            >
              you →
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <WaveBars count={22} height={42} />
              <span
                className="font-hand"
                style={{ fontSize: 20, color: "var(--ink-3)" }}
              >
                {livePartial ??
                  (paused
                    ? "paused — tap resume to continue"
                    : voiceState === "listening"
                      ? "listening…"
                      : voiceState === "thinking"
                        ? `${PARTICIPANT_INTERVIEWER_NAME.toLowerCase()} is thinking…`
                        : voiceState === "speaking"
                          ? `${PARTICIPANT_INTERVIEWER_NAME.toLowerCase()} is talking…`
                          : "take your time — speak when ready")}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {marginNote ? (
        <MarginNote top={marginNote.top}>{marginNote.text}</MarginNote>
      ) : null}

      {preStart ? <div style={{ marginTop: 36 }}>{preStart}</div> : null}
    </div>
  )
}

// ────────────────────────────────────────────────────────
// SidebarRail — three `card flat`s with project context,
// today's questions checklist, anonymity disclaimer.
// ────────────────────────────────────────────────────────

export function SidebarRail({
  config,
  activeIndex,
  doneIndices,
  respondentLabel,
}: {
  config: PublicInterviewConfig
  activeIndex: number
  doneIndices: Set<number>
  respondentLabel: string
}) {
  const preset = getProjectTypePreset(config.projectType)
  const anonymityCopy =
    config.anonymityMode === "anonymous"
      ? "Your response appears without a name or role."
      : config.anonymityMode === "pseudonymous"
        ? `Your response appears under "${respondentLabel}" instead of a name.`
        : "Your response appears with the name you provide."

  return (
    <div
      style={{
        display: "grid",
        gap: 18,
        position: "sticky",
        top: 90,
        alignSelf: "start",
      }}
    >
      <div className="card flat">
        <div
          className="font-hand"
          style={{ fontSize: 24, color: "var(--clay)", marginBottom: 4 }}
        >
          hello —
        </div>
        <h3
          className="font-serif"
          style={{
            fontSize: 24,
            margin: "0 0 12px",
            lineHeight: 1.18,
            fontWeight: 400,
          }}
        >
          {config.projectName}
        </h3>
        <p
          className="font-sans"
          style={{
            fontSize: 13,
            lineHeight: 1.55,
            color: "var(--ink-2)",
            margin: 0,
          }}
        >
          {config.objective}
        </p>
        {config.areasOfInterest.length > 0 ? (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {config.areasOfInterest.map((area) => (
              <span key={area} className="chip">
                {area}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {config.requiredQuestions.length > 0 ? (
        <div className="card flat">
          <div
            className="font-hand"
            style={{ fontSize: 24, color: "var(--clay)", marginBottom: 12 }}
          >
            today&apos;s questions
          </div>
          {config.requiredQuestions.map((q: QuestionDefinition, i) => {
            const done = doneIndices.has(i)
            const active = i === activeIndex
            return (
              <div
                key={q.id}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom:
                    i < config.requiredQuestions.length - 1
                      ? "1px dashed var(--line)"
                      : "none",
                  alignItems: "flex-start",
                }}
              >
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: "50%",
                    border:
                      "2px solid " +
                      (done
                        ? "var(--sage)"
                        : active
                          ? "var(--clay)"
                          : "var(--line)"),
                    background: done ? "var(--sage)" : "transparent",
                    display: "grid",
                    placeItems: "center",
                    marginTop: 2,
                  }}
                >
                  {done ? (
                    <span style={{ color: "var(--card)", fontSize: 11 }}>
                      ✓
                    </span>
                  ) : null}
                </span>
                <span
                  className="font-serif"
                  style={{
                    fontSize: 16,
                    lineHeight: 1.4,
                    color: done
                      ? "var(--ink-3)"
                      : active
                        ? "var(--ink)"
                        : "var(--ink-2)",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {q.prompt}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div className="card flat" style={{ background: "var(--card-2)" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Anonymity · {config.anonymityMode}
        </div>
        <p
          className="font-sans"
          style={{
            fontSize: 12.5,
            lineHeight: 1.5,
            color: "var(--ink-2)",
            margin: 0,
          }}
        >
          {anonymityCopy}
        </p>
        {preset.disclosureLines.length > 0 ? (
          <ul
            className="font-sans"
            style={{
              margin: "10px 0 0",
              paddingLeft: 18,
              fontSize: 12,
              lineHeight: 1.5,
              color: "var(--ink-3)",
            }}
          >
            {preset.disclosureLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────
// NotebookControls — bottom row beneath the notebook card.
// ────────────────────────────────────────────────────────

export function NotebookControls({
  paused,
  elapsedSeconds,
  durationTargetLabel,
  onTogglePause,
  onComplete,
}: {
  paused: boolean
  elapsedSeconds: number
  durationTargetLabel: string
  onTogglePause: () => void
  onComplete: () => void
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        marginTop: 22,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Button variant="clay" onClick={onComplete}>
        ◼ End conversation
      </Button>
      <Button variant="ghost" onClick={onTogglePause}>
        {paused ? "Resume" : "Pause"}
      </Button>
      <div style={{ flex: 1 }} />
      <span
        className="font-hand"
        style={{ fontSize: 22, color: "var(--ink-3)" }}
      >
        {formatMinutes(elapsedSeconds)} elapsed · {durationTargetLabel} cap
      </span>
    </div>
  )
}

// ────────────────────────────────────────────────────────
// PreStartCard — when status is ready / connecting / error,
// rendered inside NotebookCard's `preStart` slot. Centered CTA.
// ────────────────────────────────────────────────────────

export function PreStartCard({
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
            variant="ghost"
            size="lg"
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

// ────────────────────────────────────────────────────────
// Backwards-compat exports — keep older surfaces around so
// the shell can still render the legacy structure if needed.
// New code should compose NotebookCard / SidebarRail directly.
// ────────────────────────────────────────────────────────

export function CompletionSurface({
  projectType,
}: {
  projectType: PublicInterviewConfig["projectType"]
}) {
  const preset = getProjectTypePreset(projectType)
  return (
    <Completion
      headline={preset.completionTitle}
      body={`${preset.completionDescription} You can close this tab.`}
      smallPrint=""
    />
  )
}
