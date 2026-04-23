"use client"

import { useCallback, useEffect, useRef, useState } from "react"
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
import type { ProjectType, PublicInterviewConfig } from "@/lib/domain/types"
import {
  PARTICIPANT_INTERVIEWER_NAME,
  buildRealtimeInstructions,
  isParticipantInterviewerFinalLine,
} from "@/lib/openai/realtime-config"
import {
  buildRuntimePatchFromCaptureSnapshot,
  deriveCaptureMonitorSnapshot,
} from "@/lib/participant/capture-monitor"
import { detectInterviewStartSignal } from "@/lib/participant/runtime"
import { getParticipantDurationCopy } from "@/lib/participant/time-copy"
import { getProjectTypePreset } from "@/lib/project-types"

type RealtimeHistoryItem = import("@openai/agents/realtime").RealtimeItem
type RealtimeHistoryContentPart =
  import("@openai/agents/realtime").RealtimeMessageItem["content"][number]
type RealtimeSessionHandle = import("@openai/agents/realtime").RealtimeSession
type RealtimeTransportHandle =
  import("@openai/agents/realtime").OpenAIRealtimeWebRTC
type RealtimeTransportEvent = import("@openai/agents/realtime").TransportEvent

type TranscriptSpeaker = "participant" | "agent"
type CompletionTrigger = "participant" | "assistant"

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
  agentAudioRef,
}: {
  realtimeSessionRef: { current: RealtimeSessionHandle | null }
  realtimeTransportRef: { current: RealtimeTransportHandle | null }
  micStreamRef: { current: MediaStream | null }
  agentAudioRef?: { current: HTMLAudioElement | null }
}) {
  realtimeSessionRef.current?.close()
  realtimeSessionRef.current = null
  realtimeTransportRef.current = null

  micStreamRef.current?.getTracks().forEach((track) => track.stop())
  micStreamRef.current = null

  const audio = agentAudioRef?.current
  if (audio) {
    audio.pause()
    audio.srcObject = null
  }
}

type MicErrorCode =
  | "insecure"
  | "unsupported"
  | "denied"
  | "not-found"
  | "in-use"
  | "unknown"

class MicError extends Error {
  readonly code: MicErrorCode

  constructor(code: MicErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = "MicError"
  }
}

function describeMicFailure(error: unknown): MicError {
  if (error instanceof MicError) {
    return error
  }

  const isIos =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent)

  const permissionHint = isIos
    ? "On iPhone, open Settings → Safari → Microphone and allow this site, then reload."
    : "Tap the lock icon in the address bar, enable Microphone, then reload."

  const name = error instanceof DOMException ? error.name : ""

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return new MicError(
      "denied",
      `Microphone access was blocked. ${permissionHint}`
    )
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return new MicError(
      "not-found",
      "No microphone was detected on this device."
    )
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return new MicError(
      "in-use",
      "Another app is using your microphone. Close any calls or recorders and try again."
    )
  }

  if (name === "SecurityError") {
    return new MicError(
      "insecure",
      "Your browser blocked microphone access because this page isn't loaded securely. Open it over HTTPS."
    )
  }

  const message =
    error instanceof Error && error.message
      ? error.message
      : "We couldn't turn on the microphone. Try again in a moment."
  return new MicError("unknown", message)
}

async function acquireMicrophoneStream(): Promise<MediaStream> {
  if (typeof window === "undefined") {
    throw new MicError(
      "unsupported",
      "Voice interviews aren't available in this environment."
    )
  }

  if (window.isSecureContext === false) {
    throw new MicError(
      "insecure",
      "Open this link over HTTPS. Mobile browsers block microphone access on insecure pages."
    )
  }

  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    throw new MicError(
      "unsupported",
      "This browser can't access the microphone. Try the latest Safari on iPhone or Chrome on Android."
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (error) {
    throw describeMicFailure(error)
  }
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
  const preset = getProjectTypePreset(config.projectType)
  const durationCopy = getParticipantDurationCopy(
    config.projectType,
    config.durationCapMinutes
  )
  const [status, setStatus] = useState<ShellStatus>("ready")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [, setRecoveryToken] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [interviewStarted, setInterviewStarted] = useState(false)
  const realtimeSessionRef = useRef<RealtimeSessionHandle | null>(null)
  const realtimeTransportRef = useRef<RealtimeTransportHandle | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const statusRef = useRef<ShellStatus>("ready")
  const voiceStateRef = useRef<VoiceState>("idle")
  const interviewStartedRef = useRef(false)
  const elapsedSecondsRef = useRef(0)
  const introDeliveredRef = useRef(false)
  const latestHistoryRef = useRef<RealtimeHistoryItem[]>([])
  const completionStartedRef = useRef(false)
  const pendingAssistantCompletionHistoryRef = useRef<
    RealtimeHistoryItem[] | null
  >(null)
  const lastCoachingKeyRef = useRef<string | null>(null)
  const lastRuntimeSignatureRef = useRef<string | null>(null)
  const persistedItemIdsRef = useRef<Set<string>>(new Set())
  const inflightItemIdsRef = useRef<Set<string>>(new Set())
  const flushPromiseRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    return () =>
      teardownRealtime({
        realtimeSessionRef,
        realtimeTransportRef,
        micStreamRef,
        agentAudioRef,
      })
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

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    voiceStateRef.current = voiceState
  }, [voiceState])

  const updateVoiceState = useCallback((nextState: VoiceState) => {
    voiceStateRef.current = nextState
    setVoiceState(nextState)
  }, [])

  const postRuntimeEvent = useCallback(
    async (runtime: Record<string, unknown>) => {
      if (completionStartedRef.current) {
        return
      }

      const activeSessionId = sessionIdRef.current

      if (!activeSessionId) {
        return
      }

      const response = await fetch(
        `/api/public/sessions/${activeSessionId}/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ runtime }),
        }
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(
          payload.error ?? "We couldn't save the latest interview state update."
        )
      }
    },
    []
  )

  const updateRealtimeGuidance = useCallback(
    async ({
      coachingKey,
      coachingInstructions,
    }: {
      coachingKey?: string
      coachingInstructions?: string
    }) => {
      if (completionStartedRef.current) {
        return
      }

      const handle = realtimeSessionRef.current

      if (!handle || !coachingKey || !coachingInstructions) {
        return
      }

      if (lastCoachingKeyRef.current === coachingKey) {
        return
      }

      lastCoachingKeyRef.current = coachingKey

      try {
        const realtime = await import("@openai/agents/realtime")
        await handle.updateAgent(
          new realtime.RealtimeAgent({
            name: PARTICIPANT_INTERVIEWER_NAME,
            instructions: buildRealtimeInstructions(
              config,
              coachingInstructions
            ),
          })
        )
      } catch (error) {
        console.error("Unable to update feedback capture guidance.", error)
      }
    },
    [config]
  )

  const buildCaptureRuntimePatch = useCallback(
    (history: RealtimeHistoryItem[]) => {
      if (
        completionStartedRef.current ||
        !interviewStartedRef.current ||
        statusRef.current === "paused"
      ) {
        return null
      }

      const snapshot = deriveCaptureMonitorSnapshot({
        config,
        turns: extractTranscriptSegments(history),
        elapsedSeconds: elapsedSecondsRef.current,
        interviewStarted: interviewStartedRef.current,
      })

      if (snapshot.shouldCoach) {
        void updateRealtimeGuidance(snapshot)
      }

      const runtime = {
        ...buildRuntimePatchFromCaptureSnapshot(snapshot),
        elapsedSeconds: elapsedSecondsRef.current,
      }
      const signature = JSON.stringify(runtime)

      if (lastRuntimeSignatureRef.current === signature) {
        return null
      }

      lastRuntimeSignatureRef.current = signature
      return runtime
    },
    [config, updateRealtimeGuidance]
  )

  const queueSessionEventPersist = useCallback(
    (
      history: RealtimeHistoryItem[],
      runtime?: Record<string, unknown>
    ): Promise<void> => {
      const activeSessionId = sessionIdRef.current

      if (!activeSessionId) {
        return flushPromiseRef.current
      }

      const segments = extractTranscriptSegments(history).filter((segment) => {
        return (
          !persistedItemIdsRef.current.has(segment.sourceItemId) &&
          !inflightItemIdsRef.current.has(segment.sourceItemId)
        )
      })

      if (segments.length === 0 && runtime === undefined) {
        return flushPromiseRef.current
      }

      segments.forEach((segment) =>
        inflightItemIdsRef.current.add(segment.sourceItemId)
      )

      flushPromiseRef.current = flushPromiseRef.current
        .catch(() => undefined)
        .then(async () => {
          const body =
            runtime === undefined
              ? { segments }
              : segments.length > 0
                ? { segments, runtime }
                : { runtime }
          const response = await fetch(
            `/api/public/sessions/${activeSessionId}/events`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
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

      return flushPromiseRef.current
    },
    []
  )

  useEffect(() => {
    if (
      status !== "live" ||
      !interviewStarted ||
      config.projectType !== "feedback" ||
      elapsedSeconds === 0 ||
      elapsedSeconds % 30 !== 0
    ) {
      return
    }

    const runtime = buildCaptureRuntimePatch(latestHistoryRef.current)

    if (!runtime) {
      return
    }

    void postRuntimeEvent(runtime).catch((error) => {
      console.error("Unable to persist feedback capture state.", error)
    })
  }, [
    buildCaptureRuntimePatch,
    config.projectType,
    elapsedSeconds,
    interviewStarted,
    postRuntimeEvent,
    status,
  ])

  function maybeStartInterview(history: RealtimeHistoryItem[]) {
    if (completionStartedRef.current || interviewStartedRef.current) {
      return
    }

    const participantSegments = extractTranscriptSegments(history).filter(
      (segment) => segment.speaker === "participant"
    )
    const latestParticipantTurn =
      participantSegments[participantSegments.length - 1]

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
    updateVoiceState("idle")
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
    if (completionStartedRef.current || statusRef.current === "paused") {
      return
    }

    if (event.type === "input_audio_buffer.speech_started") {
      updateVoiceState("listening")
      return
    }

    if (event.type === "input_audio_buffer.speech_stopped") {
      updateVoiceState("thinking")
    }
  }

  async function flushTranscriptQueue() {
    await flushPromiseRef.current
  }

  const beginCompletion = useCallback(
    (
      trigger: CompletionTrigger,
      historySnapshot = latestHistoryRef.current
    ) => {
      const activeSessionId = sessionIdRef.current

      if (!activeSessionId || completionStartedRef.current) {
        return
      }

      const wasSpeaking = voiceStateRef.current === "speaking"
      completionStartedRef.current = true
      pendingAssistantCompletionHistoryRef.current = null
      statusRef.current = "complete"
      setStatus("complete")
      updateVoiceState("idle")

      void queueSessionEventPersist(historySnapshot).catch((error) => {
        console.error("Unable to persist the final transcript snapshot.", error)
      })

      const handle = realtimeSessionRef.current

      if (trigger === "participant" && wasSpeaking) {
        handle?.interrupt()
      }

      teardownRealtime({
        realtimeSessionRef,
        realtimeTransportRef,
        micStreamRef,
        agentAudioRef,
      })

      const completionElapsedSeconds = elapsedSecondsRef.current

      void (async () => {
        try {
          await flushTranscriptQueue()
        } catch (error) {
          console.error(
            "Unable to flush transcript updates before completion.",
            error
          )
        }

        try {
          const response = await fetch(
            `/api/public/sessions/${activeSessionId}/complete`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                elapsedSeconds: completionElapsedSeconds,
              }),
            }
          )

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}))
            console.error(
              payload.error ??
                "We couldn't wrap up the interview after local completion."
            )
          }
        } catch (error) {
          console.error("Unable to finalize participant completion.", error)
        }
      })()
    },
    [queueSessionEventPersist, updateVoiceState]
  )

  function maybeQueueAssistantCompletion(history: RealtimeHistoryItem[]) {
    if (completionStartedRef.current) {
      return
    }

    const agentSegments = extractTranscriptSegments(history).filter(
      (segment) => segment.speaker === "agent"
    )
    const latestAgentTurn = agentSegments[agentSegments.length - 1]

    if (
      !latestAgentTurn ||
      !isParticipantInterviewerFinalLine(latestAgentTurn.text)
    ) {
      return
    }

    pendingAssistantCompletionHistoryRef.current = history

    if (voiceStateRef.current !== "speaking") {
      beginCompletion("assistant", history)
    }
  }

  function queueTranscriptFlush(history: RealtimeHistoryItem[]) {
    if (completionStartedRef.current) {
      return
    }

    latestHistoryRef.current = history
    maybeStartInterview(history)
    const runtime = buildCaptureRuntimePatch(history)

    void queueSessionEventPersist(history, runtime ?? undefined).catch(
      (error) => {
        console.error("Unable to persist transcript updates.", error)
      }
    )
    maybeQueueAssistantCompletion(history)
  }

  async function handleStart() {
    setErrorMessage(null)
    setStatus("requesting_mic")
    updateVoiceState("idle")
    setElapsedSeconds(0)
    setInterviewStarted(false)
    interviewStartedRef.current = false
    elapsedSecondsRef.current = 0
    introDeliveredRef.current = false
    latestHistoryRef.current = []
    completionStartedRef.current = false
    pendingAssistantCompletionHistoryRef.current = null
    lastCoachingKeyRef.current = null
    lastRuntimeSignatureRef.current = null
    teardownRealtime({
      realtimeSessionRef,
      realtimeTransportRef,
      micStreamRef,
      agentAudioRef,
    })
    sessionIdRef.current = null
    persistedItemIdsRef.current.clear()
    inflightItemIdsRef.current.clear()
    flushPromiseRef.current = Promise.resolve()

    try {
      micStreamRef.current = await acquireMicrophoneStream()
    } catch (error) {
      console.error("Microphone acquisition failed.", error)
      const failure = describeMicFailure(error)
      setStatus("error")
      setErrorMessage(failure.message)
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
        teardownRealtime({
          realtimeSessionRef,
          realtimeTransportRef,
          micStreamRef,
          agentAudioRef,
        })
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

      const agentAudio = agentAudioRef.current ?? undefined
      if (agentAudio) {
        agentAudio.autoplay = true
        agentAudio.muted = false
        try {
          await agentAudio.play().catch(() => undefined)
        } catch {
          // Some browsers reject play() until srcObject is set. Safe to ignore.
        }
      }

      const transport = new realtime.OpenAIRealtimeWebRTC({
        mediaStream: micStream,
        audioElement: agentAudio,
      })
      realtimeTransportRef.current = transport
      const session = new realtime.RealtimeSession(agent, { transport })
      realtimeSessionRef.current = session
      await session.connect({ apiKey: secret })
      session.on("transport_event", handleTransportEvent)
      session.on("agent_start", () => {
        if (!completionStartedRef.current && statusRef.current !== "paused") {
          updateVoiceState("thinking")
        }
      })
      session.on("audio_start", () => {
        if (completionStartedRef.current) {
          return
        }

        updateVoiceState("speaking")

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
        if (completionStartedRef.current) {
          return
        }

        const completionHistory = pendingAssistantCompletionHistoryRef.current

        if (completionHistory) {
          beginCompletion("assistant", completionHistory)
          return
        }

        if (statusRef.current !== "paused") {
          updateVoiceState("idle")
        }
      })
      session.on("audio_interrupted", () => {
        if (!completionStartedRef.current && statusRef.current !== "paused") {
          updateVoiceState("idle")
        }
      })
      session.on("history_updated", queueTranscriptFlush)

      setStatus("live")
      updateVoiceState("thinking")
      transport.requestResponse()
    } catch (error) {
      console.error("Realtime session setup failed.", error)
      teardownRealtime({
        realtimeSessionRef,
        realtimeTransportRef,
        micStreamRef,
        agentAudioRef,
      })
      setStatus("error")
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Your mic didn't connect. Check browser permissions and try again."
      )
    }
  }

  function handleTogglePause() {
    if (completionStartedRef.current) {
      return
    }

    const handle = realtimeSessionRef.current
    if (!handle) return

    if (status === "live") {
      handle.mute(true)
      setStatus("paused")
      updateVoiceState("idle")
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
      updateVoiceState("idle")
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
    beginCompletion("participant")
  }

  if (status === "complete") {
    return <CompletionSurface projectType={config.projectType} />
  }

  const isLive = status === "live" || status === "paused"
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <audio
        ref={agentAudioRef}
        autoPlay
        className="sr-only"
        aria-hidden="true"
      />
      <Card className="space-y-6">
        <CardHeader>
          <CardTitle className="text-3xl">{config.projectName}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            {durationCopy.shellLabel} One question at a time.
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
              durationTargetLabel={durationCopy.timerTargetLabel}
              durationAriaDescription={durationCopy.timerAriaDescription}
              interviewStarted={interviewStarted}
              paused={status === "paused"}
              onTogglePause={handleTogglePause}
              onComplete={handleComplete}
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
                    ? `By label only — you'll appear as a labeled ${preset.anonymousRespondentLabel.toLowerCase()}, not by name.`
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

function CompletionSurface({ projectType }: { projectType: ProjectType }) {
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
