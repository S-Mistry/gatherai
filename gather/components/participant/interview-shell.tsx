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
import {
  PARTICIPANT_INTERVIEWER_NAME,
  buildRealtimeInstructions,
} from "@/lib/openai/realtime-config"
import { detectInterviewStartSignal } from "@/lib/participant/runtime"

type RealtimeHistoryItem = import("@openai/agents/realtime").RealtimeItem
type RealtimeHistoryContentPart =
  import("@openai/agents/realtime").RealtimeMessageItem["content"][number]
type RealtimeSessionHandle = import("@openai/agents/realtime").RealtimeSession
type RealtimeTransportHandle =
  import("@openai/agents/realtime").OpenAIRealtimeWebRTC
type RealtimeTransportEvent =
  import("@openai/agents/realtime").TransportEvent

type TranscriptSpeaker = "participant" | "agent"

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

interface TranscriptPayloadSegment {
  sourceItemId: string
  speaker: TranscriptSpeaker
  text: string
}

function teardownRealtime({
  realtimeSessionRef,
  realtimeTransportRef,
  micStreamRef,
}: {
  realtimeSessionRef: { current: RealtimeSessionHandle | null }
  realtimeTransportRef: { current: RealtimeTransportHandle | null }
  micStreamRef: { current: MediaStream | null }
}) {
  realtimeSessionRef.current?.close()
  realtimeSessionRef.current = null
  realtimeTransportRef.current = null

  micStreamRef.current?.getTracks().forEach((track) => track.stop())
  micStreamRef.current = null
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

function extractTranscriptParts(content: RealtimeHistoryContentPart[] = []) {
  return content
    .map((part) => {
      if (part.type === "input_text" || part.type === "output_text") {
        return typeof part.text === "string" ? part.text.trim() : ""
      }

      if (part.type === "input_audio" || part.type === "output_audio") {
        return typeof part.transcript === "string" ? part.transcript.trim() : ""
      }

      return ""
    })
    .filter(Boolean)
}

function extractTranscriptSegments(
  history: RealtimeHistoryItem[]
): TranscriptPayloadSegment[] {
  return history.flatMap((item) => {
    if (item.type !== "message" || item.role === "system") {
      return []
    }

    if (item.status !== "completed") {
      return []
    }

    const text = extractTranscriptParts(item.content).join(" ").trim()

    if (!item.itemId || !text) {
      return []
    }

    return [
      {
        sourceItemId: item.itemId,
        speaker: item.role === "user" ? "participant" : "agent",
        text,
      },
    ]
  })
}

export function InterviewShell({ linkToken, config }: InterviewShellProps) {
  const [status, setStatus] = useState<ShellStatus>("ready")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [, setRecoveryToken] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [pending, startTransition] = useTransition()
  const realtimeSessionRef = useRef<RealtimeSessionHandle | null>(null)
  const realtimeTransportRef = useRef<RealtimeTransportHandle | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const statusRef = useRef<ShellStatus>("ready")
  const interviewStartedRef = useRef(false)
  const introDeliveredRef = useRef(false)
  const persistedItemIdsRef = useRef<Set<string>>(new Set())
  const inflightItemIdsRef = useRef<Set<string>>(new Set())
  const flushPromiseRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    return () =>
      teardownRealtime({ realtimeSessionRef, realtimeTransportRef, micStreamRef })
  }, [])

  useEffect(() => {
    if (status !== "live" || !interviewStarted) return
    const id = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    return () => window.clearInterval(id)
  }, [interviewStarted, status])

  useEffect(() => {
    sessionIdRef.current = sessionId
  }, [sessionId])

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    interviewStartedRef.current = interviewStarted
  }, [interviewStarted])

  async function postRuntimeEvent(runtime: Record<string, unknown>) {
    const activeSessionId = sessionIdRef.current

    if (!activeSessionId) {
      return
    }

    const response = await fetch(`/api/public/sessions/${activeSessionId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runtime }),
    })

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(
        payload.error ?? "We couldn't save the latest interview state update."
      )
    }
  }

  function maybeStartInterview(history: RealtimeHistoryItem[]) {
    if (interviewStartedRef.current) {
      return
    }

    const participantSegments = extractTranscriptSegments(history).filter(
      (segment) => segment.speaker === "participant"
    )
    const latestParticipantTurn = participantSegments[participantSegments.length - 1]

    if (!latestParticipantTurn) {
      return
    }

    const startSignal = detectInterviewStartSignal(latestParticipantTurn.text)

    if (!startSignal) {
      return
    }

    const timestamp = new Date().toISOString()
    const activeQuestionId = config.requiredQuestions[0]?.id ?? null
    interviewStartedRef.current = true
    setInterviewStarted(true)
    setElapsedSeconds(0)
    setVoiceState("idle")
    void postRuntimeEvent({
      state: "question_active",
      activeQuestionId,
      elapsedSeconds: 0,
      readinessDetectedAt: timestamp,
      interviewStartedAt: timestamp,
      pausedAt: null,
    }).catch((error) => {
      console.error("Unable to persist interview start state.", error)
    })
  }

  function handleTransportEvent(event: RealtimeTransportEvent) {
    if (statusRef.current === "paused") {
      return
    }

    if (event.type === "input_audio_buffer.speech_started") {
      setVoiceState("listening")
      return
    }

    if (event.type === "input_audio_buffer.speech_stopped") {
      setVoiceState("thinking")
    }
  }

  function queueTranscriptFlush(history: RealtimeHistoryItem[]) {
    maybeStartInterview(history)
    const activeSessionId = sessionIdRef.current

    if (!activeSessionId) {
      return
    }

    const segments = extractTranscriptSegments(history).filter((segment) => {
      return (
        !persistedItemIdsRef.current.has(segment.sourceItemId) &&
        !inflightItemIdsRef.current.has(segment.sourceItemId)
      )
    })

    if (segments.length === 0) {
      return
    }

    segments.forEach((segment) =>
      inflightItemIdsRef.current.add(segment.sourceItemId)
    )

    flushPromiseRef.current = flushPromiseRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch(
          `/api/public/sessions/${activeSessionId}/events`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ segments }),
          }
        )

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          segments.forEach((segment) =>
            inflightItemIdsRef.current.delete(segment.sourceItemId)
          )
          throw new Error(
            payload.error ?? "We couldn't save the latest transcript updates."
          )
        }

        segments.forEach((segment) => {
          inflightItemIdsRef.current.delete(segment.sourceItemId)
          persistedItemIdsRef.current.add(segment.sourceItemId)
        })
      })
  }

  async function flushTranscriptQueue() {
    await flushPromiseRef.current
  }

  async function handleStart() {
    setErrorMessage(null)
    setStatus("requesting_mic")
    setVoiceState("idle")
    setElapsedSeconds(0)
    setInterviewStarted(false)
    interviewStartedRef.current = false
    introDeliveredRef.current = false
    teardownRealtime({ realtimeSessionRef, realtimeTransportRef, micStreamRef })
    sessionIdRef.current = null
    persistedItemIdsRef.current.clear()
    inflightItemIdsRef.current.clear()
    flushPromiseRef.current = Promise.resolve()

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })
    } catch {
      setStatus("error")
      setErrorMessage(
        "We need microphone access to talk. Open your browser settings to allow it, then try again."
      )
      return
    }

    setStatus("connecting")

    try {
      const sessionResponse = await fetch(
        `/api/public/links/${linkToken}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: {} }),
        }
      )

      const sessionPayload = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(
          sessionPayload.error ??
            "We couldn't start the interview. Please refresh and try again."
        )
      }

      sessionIdRef.current = sessionPayload.session.id
      setSessionId(sessionPayload.session.id)
      setRecoveryToken(sessionPayload.recoveryToken)

      const secretResponse = await fetch(
        `/api/public/sessions/${sessionPayload.session.id}/client-secret`,
        { method: "POST" }
      )

      const secretPayload = await secretResponse.json()
      const secret = extractClientSecretValue(secretPayload)

      if (!secretResponse.ok || !secret) {
        teardownRealtime({ realtimeSessionRef, realtimeTransportRef, micStreamRef })
        setStatus("fallback")
        setErrorMessage(
          secretPayload.error ??
            "We can't start a live voice session right now. Try refreshing the page — if it keeps happening, let the consultant know."
        )
        return
      }

      const realtime = await import("@openai/agents/realtime")
      const agent = new realtime.RealtimeAgent({
        name: PARTICIPANT_INTERVIEWER_NAME,
        instructions: buildRealtimeInstructions(config),
      })
      const micStream = micStreamRef.current

      if (!micStream) {
        throw new Error(
          "Your microphone disconnected before the interview could start."
        )
      }

      const transport = new realtime.OpenAIRealtimeWebRTC({
        mediaStream: micStream,
      })
      realtimeTransportRef.current = transport
      const session = new realtime.RealtimeSession(agent, { transport })
      realtimeSessionRef.current = session
      await session.connect({ apiKey: secret })
      session.on("transport_event", handleTransportEvent)
      session.on("agent_start", () => {
        if (statusRef.current !== "paused") {
          setVoiceState("thinking")
        }
      })
      session.on("audio_start", () => {
        setVoiceState("speaking")

        if (!introDeliveredRef.current) {
          introDeliveredRef.current = true
          void postRuntimeEvent({
            state: "intro",
            introDeliveredAt: new Date().toISOString(),
          }).catch((error) => {
            console.error("Unable to persist intro state.", error)
          })
        }
      })
      session.on("audio_stopped", () => {
        if (statusRef.current !== "paused") {
          setVoiceState("idle")
        }
      })
      session.on("audio_interrupted", () => {
        if (statusRef.current !== "paused") {
          setVoiceState("idle")
        }
      })
      session.on("history_updated", queueTranscriptFlush)

      setStatus("live")
      setVoiceState("thinking")
      transport.requestResponse()
    } catch (error) {
      teardownRealtime({ realtimeSessionRef, realtimeTransportRef, micStreamRef })
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
      handle.mute(true)
      setStatus("paused")
      setVoiceState("idle")
      void postRuntimeEvent({
        state: "paused",
        elapsedSeconds,
        pausedAt: new Date().toISOString(),
      }).catch((error) => {
        console.error("Unable to persist pause state.", error)
      })
    } else if (status === "paused") {
      handle.mute(false)
      setStatus("live")
      setVoiceState("idle")
      void postRuntimeEvent({
        state: interviewStartedRef.current ? "question_active" : "intro",
        elapsedSeconds,
        pausedAt: null,
      }).catch((error) => {
        console.error("Unable to persist resume state.", error)
      })
    }
  }

  function handleComplete() {
    if (!sessionId) return

    startTransition(async () => {
      try {
        await flushTranscriptQueue()
      } catch (error) {
        teardownRealtime({ realtimeSessionRef, realtimeTransportRef, micStreamRef })
        setStatus("error")
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We couldn't save the latest transcript updates."
        )
        return
      }

      const response = await fetch(
        `/api/public/sessions/${sessionId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            elapsedSeconds,
          }),
        }
      )
      const payload = await response.json()

      if (!response.ok) {
        teardownRealtime({ realtimeSessionRef, realtimeTransportRef, micStreamRef })
        setStatus("error")
        setErrorMessage(
          payload.error ??
            "We couldn't wrap up the interview. Please refresh and try again."
        )
        return
      }

      teardownRealtime({ realtimeSessionRef, realtimeTransportRef, micStreamRef })
      setVoiceState("idle")
      setStatus("complete")
    })
  }

  if (status === "complete") {
    return <CompletionSurface />
  }

  const isLive = status === "live" || status === "paused"
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
              <p className="text-sm tracking-[0.24em] text-muted-foreground uppercase">
                What we&apos;d like to learn
              </p>
              <p className="mt-3 text-base leading-7 text-foreground">
                {config.objective}
              </p>
            </div>
          ) : null}

          {isLive ? (
            <LiveSurface
              voiceState={voiceState}
              elapsedSeconds={elapsedSeconds}
              durationCapMinutes={config.durationCapMinutes}
              interviewStarted={interviewStarted}
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
              <p className="text-sm font-semibold text-foreground">
                How it works
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>One question at a time.</li>
                <li>Take as long as you want to answer.</li>
                <li>You can pause or end early — nothing is lost.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">
                How you&apos;re identified
              </p>
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
  interviewStarted,
  paused,
  onTogglePause,
  onComplete,
  completing,
}: {
  voiceState: VoiceState
  elapsedSeconds: number
  durationCapMinutes: number
  interviewStarted: boolean
  paused: boolean
  onTogglePause: () => void
  onComplete: () => void
  completing: boolean
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
          aria-label={`${formatMinutes(elapsedSeconds)} of roughly ${durationCapMinutes} minutes`}
        >
          {formatMinutes(elapsedSeconds)} / ~{durationCapMinutes} min
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
        <Button
          variant="secondary"
          size="lg"
          onClick={onComplete}
          disabled={completing}
        >
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
            Your voice isn&apos;t saved. Only the transcript helps shape the
            workshop. You can close this tab.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
