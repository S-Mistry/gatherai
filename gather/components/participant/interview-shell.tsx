"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { VoiceState } from "@/components/ui/voice-status"
import { Completion } from "@/components/participant/completion"
import {
  NotebookCard,
  NotebookControls,
  PreStartCard,
  SidebarRail,
  type InterviewShellStatus,
} from "@/components/participant/interview-shell-surfaces"
import type { TranscriptPayloadSegment } from "@/lib/participant/realtime-history"
import { getProjectTypePreset } from "@/lib/project-types"
import type { PublicInterviewConfig } from "@/lib/domain/types"
import {
  PARTICIPANT_INTERVIEWER_NAME,
  PARTICIPANT_MIC_AUDIO_CONSTRAINTS,
  buildParticipantRealtimeAudioConfig,
  buildRealtimeInstructions,
  isParticipantInterviewerFinalLine,
} from "@/lib/openai/realtime-config"
import {
  buildRuntimePatchFromCaptureSnapshot,
  deriveCaptureMonitorSnapshot,
} from "@/lib/participant/capture-monitor"
import {
  classifyMicAcquireFailure,
  collectMicDiagnostics,
  detectMicSupport,
  getMicBrowserFamily,
  type MicSupport,
} from "@/lib/participant/mic-support"
import {
  buildSessionEventsRequestBody,
  extractTranscriptSegments,
  getLatestTranscriptSegmentForSpeaker,
} from "@/lib/participant/realtime-history"
import {
  completePublicParticipantSession,
  postParticipantSessionEvents,
  requestParticipantClientSecret,
  startPublicParticipantSession,
} from "@/lib/participant/public-session-client"
import {
  teardownRealtime,
} from "@/lib/participant/realtime-session"
import { detectInterviewStartSignal } from "@/lib/participant/runtime"
import { getParticipantDurationCopy } from "@/lib/participant/time-copy"

type RealtimeHistoryItem = import("@openai/agents/realtime").RealtimeItem
type RealtimeSessionHandle = import("@openai/agents/realtime").RealtimeSession
type RealtimeTransportHandle =
  import("@openai/agents/realtime").OpenAIRealtimeWebRTC
type RealtimeTransportEvent = import("@openai/agents/realtime").TransportEvent

type CompletionTrigger = "participant" | "assistant"

interface InterviewShellProps {
  linkToken: string
  config: PublicInterviewConfig
}

export function InterviewShell({ linkToken, config }: InterviewShellProps) {
  const durationCopy = getParticipantDurationCopy(
    config.projectType,
    config.durationCapMinutes
  )
  const [status, setStatus] = useState<InterviewShellStatus>("ready")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [, setRecoveryToken] = useState<string | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [micSupport, setMicSupport] = useState<MicSupport | null>(null)
  const [transcriptSegments, setTranscriptSegments] = useState<
    TranscriptPayloadSegment[]
  >([])
  const realtimeSessionRef = useRef<RealtimeSessionHandle | null>(null)
  const realtimeTransportRef = useRef<RealtimeTransportHandle | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const agentAudioRef = useRef<HTMLAudioElement | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const statusRef = useRef<InterviewShellStatus>("ready")
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
    let cancelled = false
    collectMicDiagnostics()
      .then((diag) => {
        if (cancelled) return
        console.info("[mic-diag]", diag)
        setMicSupport(diag.support)
      })
      .catch(() => {
        if (!cancelled) setMicSupport({ kind: "ready" })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshMicSupport = useCallback(async (): Promise<MicSupport> => {
    try {
      const support = await detectMicSupport()
      setMicSupport(support)
      return support
    } catch {
      const fallback = { kind: "ready" } as const
      setMicSupport(fallback)
      return fallback
    }
  }, [])

  const recheckMicSupport = useCallback(async () => {
    setErrorMessage(null)
    setStatus("ready")
    await refreshMicSupport()
  }, [refreshMicSupport])

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

      await postParticipantSessionEvents(
        activeSessionId,
        { runtime },
        "We couldn't save the latest interview state update."
      )
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

      const persistPlan = buildSessionEventsRequestBody({
        history,
        persistedItemIds: persistedItemIdsRef.current,
        inflightItemIds: inflightItemIdsRef.current,
        runtime,
      })

      if (!persistPlan) {
        return flushPromiseRef.current
      }

      const { segments, body } = persistPlan

      segments.forEach((segment) =>
        inflightItemIdsRef.current.add(segment.sourceItemId)
      )

      flushPromiseRef.current = flushPromiseRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            await postParticipantSessionEvents(
              activeSessionId,
              body,
              "We couldn't save the latest transcript updates."
            )
          } catch (error) {
            segments.forEach((segment) =>
              inflightItemIdsRef.current.delete(segment.sourceItemId)
            )
            throw error
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

    const latestParticipantTurn = getLatestTranscriptSegmentForSpeaker(
      history,
      "participant"
    )

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
          await completePublicParticipantSession(activeSessionId, {
            elapsedSeconds: completionElapsedSeconds,
          })
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

    const latestAgentTurn = getLatestTranscriptSegmentForSpeaker(history, "agent")

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
    setTranscriptSegments(extractTranscriptSegments(history))
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
    const agentAudio = agentAudioRef.current
    if (agentAudio) {
      agentAudio.autoplay = true
      agentAudio.muted = false
      void agentAudio.play().catch(() => undefined)
    }

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

    const browserFamily =
      typeof navigator !== "undefined"
        ? getMicBrowserFamily(navigator.userAgent)
        : "other"

    if (micSupport && micSupport.kind !== "ready") {
      setStatus("error")
      setErrorMessage(micSupport.message)
      return
    }

    try {
      micStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: PARTICIPANT_MIC_AUDIO_CONSTRAINTS,
      })
    } catch (error) {
      console.error("Microphone acquisition failed.", error)
      const support = await refreshMicSupport()
      const failure = classifyMicAcquireFailure({
        errorName: error instanceof DOMException ? error.name : null,
        browserFamily,
        support,
      })
      setStatus("error")
      setErrorMessage(failure.message)
      return
    }

    setStatus("connecting")

    try {
      const sessionPayload = await startPublicParticipantSession(linkToken)

      sessionIdRef.current = sessionPayload.session.id
      setSessionId(sessionPayload.session.id)
      setRecoveryToken(sessionPayload.recoveryToken)

      let secret: string
      try {
        secret = await requestParticipantClientSecret(sessionPayload.session.id)
      } catch (error) {
        teardownRealtime({
          realtimeSessionRef,
          realtimeTransportRef,
          micStreamRef,
          agentAudioRef,
        })
        setStatus("fallback")
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "We can't start a live voice session right now. Try refreshing the page — if it keeps happening, let the consultant know."
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
        audioElement: agentAudioRef.current ?? undefined,
      })
      realtimeTransportRef.current = transport
      const session = new realtime.RealtimeSession(agent, {
        transport,
        config: {
          audio: buildParticipantRealtimeAudioConfig(),
        },
      })
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
    const preset = getProjectTypePreset(config.projectType)
    return (
      <Completion
        headline={preset.completionTitle}
        body={`${preset.completionDescription} You can close this tab.`}
        smallPrint=""
      />
    )
  }

  const isLive = status === "live" || status === "paused"
  const respondentLabel =
    config.anonymityMode === "named"
      ? "you"
      : getProjectTypePreset(config.projectType).anonymousRespondentLabel
  const completedAgentTurns = transcriptSegments.filter(
    (segment) => segment.speaker === "agent"
  ).length
  const totalQuestions = Math.max(config.requiredQuestions.length, 1)
  const activeIndex = Math.min(
    Math.max(completedAgentTurns - 1, 0),
    totalQuestions - 1
  )
  const doneIndices = new Set<number>(
    Array.from({ length: activeIndex }, (_, i) => i)
  )
  const activePrompt =
    config.requiredQuestions[activeIndex]?.prompt ??
    config.objective ??
    "Tell me about your experience."

  return (
    <div
      className="participant-interview-layout"
      style={{
        padding: "32px 40px 80px",
        maxWidth: 1320,
        margin: "0 auto",
        gap: 36,
      }}
    >
      <audio
        ref={agentAudioRef}
        autoPlay
        className="sr-only"
        aria-hidden="true"
      />
      <div style={{ position: "relative" }}>
        <NotebookCard
          respondentLabel={respondentLabel}
          activeQuestion={activePrompt}
          questionIndex={activeIndex + 1}
          totalQuestions={totalQuestions}
          segments={transcriptSegments}
          voiceState={voiceState}
          paused={status === "paused"}
          showLiveRow={isLive && interviewStarted}
          preStart={
            isLive ? null : (
              <PreStartCard
                status={status}
                errorMessage={errorMessage}
                onStart={handleStart}
                micSupport={micSupport}
                onRecheckMicSupport={recheckMicSupport}
              />
            )
          }
        />
        {isLive ? (
          <NotebookControls
            paused={status === "paused"}
            elapsedSeconds={elapsedSeconds}
            durationTargetLabel={durationCopy.timerTargetLabel}
            onTogglePause={handleTogglePause}
            onComplete={handleComplete}
          />
        ) : null}
      </div>
      <SidebarRail
        config={config}
        activeIndex={activeIndex}
        doneIndices={doneIndices}
        respondentLabel={respondentLabel}
      />
    </div>
  )
}
