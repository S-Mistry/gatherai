"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Microphone, PauseCircle, SealWarning } from "@phosphor-icons/react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PublicInterviewConfig } from "@/lib/domain/types"

type ShellStatus =
  | "ready"
  | "provisioning"
  | "connected"
  | "fallback"
  | "complete"
  | "error"

interface InterviewShellProps {
  linkToken: string
  config: PublicInterviewConfig
}

type RealtimeHandle = {
  disconnect: () => Promise<void> | void
}

function buildBrowserInstructions(config: PublicInterviewConfig) {
  return [
    `You are the workshop discovery interviewer for ${config.projectName}.`,
    `Objective: ${config.objective}`,
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

export function InterviewShell({ linkToken, config }: InterviewShellProps) {
  const [status, setStatus] = useState<ShellStatus>("ready")
  const [message, setMessage] = useState(
    "Review the disclosure, then start when you are ready."
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const realtimeSessionRef = useRef<RealtimeHandle | null>(null)

  useEffect(() => {
    return () => {
      void realtimeSessionRef.current?.disconnect?.()
    }
  }, [])

  async function handleStart() {
    setStatus("provisioning")
    setMessage("Creating your session and preparing voice transport...")

    try {
      const sessionResponse = await fetch(`/api/public/links/${linkToken}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {},
        }),
      })

      const sessionPayload = await sessionResponse.json()

      if (!sessionResponse.ok) {
        throw new Error(sessionPayload.error ?? "Unable to create the interview session.")
      }

      setSessionId(sessionPayload.session.id)
      setRecoveryToken(sessionPayload.recoveryToken)

      const secretResponse = await fetch(
        `/api/public/sessions/${sessionPayload.session.id}/client-secret`,
        {
          method: "POST",
        }
      )

      const secretPayload = await secretResponse.json()
      const secret = extractClientSecretValue(secretPayload)

      if (!secretResponse.ok || !secret) {
        setStatus("fallback")
        setMessage(
          secretPayload.error ??
            "Realtime credentials are not configured yet. The participant flow is scaffolded and ready for env wiring."
        )
        return
      }

      await navigator.mediaDevices.getUserMedia({ audio: true })

      const realtime = await import("@openai/agents/realtime")
      const agent = new realtime.RealtimeAgent({
        name: "GatherAI Interviewer",
        instructions: buildBrowserInstructions(config),
      })
      const session = new realtime.RealtimeSession(agent)
      await session.connect({ apiKey: secret })

      realtimeSessionRef.current = session as unknown as RealtimeHandle
      setStatus("connected")
      setMessage(
        "Realtime voice transport is connected. Use the session controls below to persist transcript events and completion."
      )
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Unable to start the voice session.")
    }
  }

  function handleDemoEvent() {
    if (!sessionId) {
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/public/sessions/${sessionId}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          segments: [
            {
              speaker: "participant",
              text: "The main bottleneck is that no one knows who can approve exceptions without escalating.",
            },
          ],
        }),
      })

      const payload = await response.json()

      if (response.ok) {
        setMessage(`Stored ${payload.accepted} transcript segment(s) for this session.`)
      } else {
        setMessage(payload.error ?? "Unable to store transcript events.")
      }
    })
  }

  function handleComplete() {
    if (!sessionId) {
      return
    }

    startTransition(async () => {
      const response = await fetch(`/api/public/sessions/${sessionId}/complete`, {
        method: "POST",
      })
      const payload = await response.json()

      if (!response.ok) {
        setStatus("error")
        setMessage(payload.error ?? "Unable to complete the interview.")
        return
      }

      setStatus("complete")
      setMessage(
        `Interview completed. ${payload.jobCount} analysis job(s) queued for cleaning, extraction, scoring, and synthesis.`
      )
    })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="space-y-6">
        <CardHeader>
          <Badge variant="accent">Participant interview</Badge>
          <CardTitle className="text-3xl">{config.projectName}</CardTitle>
          <CardDescription>
            {config.disclosure} This project uses a {config.anonymityMode} identity mode and
            targets a {config.durationCapMinutes}-minute conversation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-[28px] border border-border/70 bg-background/80 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
              Objective
            </p>
            <p className="mt-3 text-base leading-7 text-foreground">{config.objective}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={handleStart} disabled={pending || status === "connected"}>
              <Microphone className="size-4" />
              {status === "connected" ? "Voice connected" : "Start interview"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleDemoEvent}
              disabled={!sessionId || pending}
            >
              <PauseCircle className="size-4" />
              Store demo segment
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleComplete}
              disabled={!sessionId || pending || status === "complete"}
            >
              Complete session
            </Button>
          </div>

          <div className="rounded-3xl border border-dashed border-border/70 bg-card/60 p-5">
            <div className="flex items-start gap-3">
              <SealWarning className="mt-0.5 size-5 text-primary" />
              <div className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Session status
                </p>
                <p className="text-base leading-7 text-foreground">{message}</p>
                {sessionId ? (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Session: {sessionId}</p>
                    <p className="truncate">Recovery token: {recoveryToken}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="space-y-6">
        <CardHeader>
          <Badge variant="neutral">Before you start</Badge>
          <CardTitle>Interview guideposts</CardTitle>
          <CardDescription>
            The AI interviewer stays focused on required discovery questions and stops at the
            configured duration cap.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-semibold text-foreground">Anonymity mode</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {config.anonymityMode === "anonymous"
                ? "Responses are collected without explicit identity fields."
                : config.anonymityMode === "pseudonymous"
                  ? "Responses use a pseudonymous stakeholder label."
                  : "Responses are attributed by name."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-semibold text-foreground">Metadata prompts</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {config.metadataPrompts.map((prompt) => (
                <li key={prompt.id}>
                  {prompt.label}
                  {prompt.required ? " (required)" : " (optional)"}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-semibold text-foreground">Operational notes</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>One core question at a time.</li>
              <li>Two follow-ups by default unless novelty remains high.</li>
              <li>Transcript-only storage in MVP.</li>
              <li>Resume remains valid for 24 hours after last activity.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
