"use client"

import { useEffect, useRef, useState } from "react"
import { Star, WarningCircle } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  MicRing,
  Scribble,
  Stamp,
  StickyNote,
  Tape,
  WaveBars,
} from "@/components/ui/ornaments"
import { Textarea } from "@/components/ui/textarea"
import type { PublicTestimonialConfig } from "@/lib/domain/types"
import { PARTICIPANT_MIC_AUDIO_CONSTRAINTS } from "@/lib/openai/realtime-config"
import { cn } from "@/lib/utils"

type CaptureState =
  | "ready"
  | "recording"
  | "transcribing"
  | "review"
  | "submitting"
  | "submitted"
  | "error"

interface TestimonialCaptureShellProps {
  config: PublicTestimonialConfig
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = String(seconds % 60).padStart(2, "0")
  return `${minutes}:${remainder}`
}

function getRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return undefined
  }

  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  return options.find((option) => MediaRecorder.isTypeSupported(option))
}

export function TestimonialCaptureShell({
  config,
}: TestimonialCaptureShellProps) {
  const [state, setState] = useState<CaptureState>("ready")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [transcript, setTranscript] = useState("")
  const [reviewerName, setReviewerName] = useState("")
  const [rating, setRating] = useState(0)
  const [suggestedRating, setSuggestedRating] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (state !== "recording") return
    const id = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)
    return () => window.clearInterval(id)
  }, [state])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  async function transcribe(blob: Blob) {
    setState("transcribing")
    setErrorMessage(null)

    const formData = new FormData()
    const extension = blob.type.includes("mp4") ? "mp4" : "webm"
    formData.append("audio", blob, `review.${extension}`)

    const response = await fetch(
      `/api/public/testimonials/${config.linkToken}/transcribe`,
      {
        method: "POST",
        body: formData,
      }
    )
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(
        typeof payload.error === "string"
          ? payload.error
          : "We couldn't transcribe that recording. Please try again."
      )
    }

    const nextTranscript =
      typeof payload.transcript === "string" ? payload.transcript : ""
    const nextSuggestedRating =
      typeof payload.suggestedRating === "number"
        ? payload.suggestedRating
        : null

    setTranscript(nextTranscript)
    setSuggestedRating(nextSuggestedRating)
    setRating(nextSuggestedRating ?? 0)
    setState("review")
  }

  async function startRecording() {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setState("error")
      setErrorMessage(
        "This browser can't record a voice review. Try Safari or Chrome."
      )
      return
    }

    try {
      setErrorMessage(null)
      setElapsedSeconds(0)
      chunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: PARTICIPANT_MIC_AUDIO_CONSTRAINTS,
      })
      streamRef.current = stream
      const mimeType = getRecordingMimeType()
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      )
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        void transcribe(blob).catch((error) => {
          console.error("Unable to transcribe testimonial.", error)
          setState("error")
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "We couldn't transcribe that recording. Please try again."
          )
        })
      }
      recorder.start()
      setState("recording")
    } catch (error) {
      console.error("Unable to start testimonial recording.", error)
      setState("error")
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't access your microphone. Check permissions and try again."
      )
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") {
      recorder.stop()
    }
  }

  async function submitReview() {
    if (!transcript.trim() || rating < 1) {
      return
    }

    setState("submitting")
    setErrorMessage(null)

    try {
      const response = await fetch(
        `/api/public/testimonials/${config.linkToken}/reviews`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            reviewerName: reviewerName.trim() || undefined,
            rating,
            suggestedRating,
          }),
        }
      )
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "We couldn't submit your review. Please try again."
        )
      }

      setState("submitted")
    } catch (error) {
      console.error("Unable to submit testimonial review.", error)
      setState("review")
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We couldn't submit your review. Please try again."
      )
    }
  }

  if (state === "submitted") {
    return (
      <div className="text-center" style={{ padding: "60px 24px" }}>
        <div className="mb-9">
          <Stamp variant="sage">received · thank you</Stamp>
        </div>
        <h2
          className="font-serif"
          style={{
            fontSize: 64,
            fontWeight: 400,
            lineHeight: 1.0,
            letterSpacing: "-0.02em",
            margin: "0 0 24px",
          }}
        >
          Thanks — that helps.
        </h2>
        <div
          className="font-hand inline-block mb-8"
          style={{
            fontSize: 28,
            color: "var(--clay)",
            transform: "rotate(-1deg)",
          }}
        >
          — really.
        </div>
        <p
          className="font-serif"
          style={{
            fontSize: 20,
            lineHeight: 1.5,
            color: "var(--ink-2)",
            margin: "0 auto 36px",
            maxWidth: 480,
          }}
        >
          Your review will appear once {config.businessName} approves it. You
          can close this tab.
        </p>
        <div
          className="inline-block"
          style={{ transform: "rotate(-2deg)" }}
        >
          <StickyNote tint="sage" className="max-w-[320px] text-left">
            <div
              className="font-hand"
              style={{ fontSize: 20, color: "var(--ink)", lineHeight: 1.3 }}
            >
              when {config.businessName} reviews this,
              <br />
              they&apos;ll see your words — never your audio.
            </div>
          </StickyNote>
        </div>
      </div>
    )
  }

  if (state === "review" || state === "submitting") {
    return (
      <div className="space-y-7">
        <div
          className="card flat relative"
          style={{ padding: "32px 36px", background: "var(--card-2)" }}
        >
          <Tape
            tint="green"
            style={{ top: -11, left: 60, transform: "rotate(-2deg)" }}
          />
          <span className="eyebrow">{config.businessName}</span>
          <h2
            className="font-serif mt-2"
            style={{ fontSize: 30, fontWeight: 400, margin: "8px 0 8px" }}
          >
            <Scribble>{config.headline}</Scribble>
          </h2>
          <p
            className="font-sans m-0"
            style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-2)" }}
          >
            {config.prompt}
          </p>
        </div>

        <Field label="star rating" htmlFor="rating">
          <StarRating value={rating} onChange={setRating} />
          {suggestedRating ? (
            <span className="font-sans text-xs text-[var(--ink-3)]">
              We suggested {suggestedRating} stars. Change it if needed.
            </span>
          ) : null}
        </Field>

        <Field label="your review" htmlFor="transcript">
          <Textarea
            id="transcript"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={6}
          />
        </Field>

        <Field label="your name (optional)" htmlFor="reviewerName">
          <Input
            id="reviewerName"
            value={reviewerName}
            onChange={(event) => setReviewerName(event.target.value)}
            placeholder="Your name (optional)"
          />
        </Field>

        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

        <Button
          size="lg"
          variant="clay"
          onClick={() => void submitReview()}
          disabled={state === "submitting" || !transcript.trim() || rating < 1}
          style={{ backgroundColor: config.brandColor }}
        >
          {state === "submitting" ? "Submitting…" : "Submit review →"}
        </Button>
      </div>
    )
  }

  // ready / recording / transcribing / error
  const recording = state === "recording"
  const transcribingState = state === "transcribing"

  return (
    <div className="space-y-9">
      <div className="text-center">
        <div className="eyebrow mb-4">
          for {config.businessName} · under 2 minutes
        </div>
        <div
          className="card flat relative text-left mx-auto"
          style={{ padding: "30px 36px", maxWidth: 720 }}
        >
          <Tape
            tint="green"
            style={{
              top: -11,
              left: "50%",
              transform: "translateX(-50%) rotate(2deg)",
            }}
          />
          <div className="font-hand text-[24px] text-[var(--sage)]">
            one question —
          </div>
          <h1
            className="font-serif mt-2"
            style={{
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.18,
              letterSpacing: "-0.005em",
              margin: 0,
            }}
          >
            <Scribble>{config.prompt}</Scribble>
          </h1>
        </div>
      </div>

      <div className="grid place-items-center">
        <MicRing
          active={recording}
          onClick={() => {
            if (recording) {
              stopRecording()
            } else if (!transcribingState) {
              void startRecording()
            }
          }}
        />
      </div>

      <div className="flex items-center justify-center gap-4 flex-wrap">
        {recording && <WaveBars count={20} height={36} />}
        <span
          className="font-serif"
          style={{ fontSize: 24, color: "var(--ink-2)", fontStyle: "italic" }}
        >
          {recording
            ? `recording · ${formatSeconds(elapsedSeconds)}`
            : transcribingState
              ? "turning your voice into text…"
              : "tap to record"}
        </span>
      </div>

      <p
        className="font-sans mx-auto text-center"
        style={{
          fontSize: 13,
          color: "var(--ink-3)",
          maxWidth: 460,
          lineHeight: 1.5,
        }}
      >
        Take your time. There&apos;s no live transcript — just speak. When
        you&apos;re done, you&apos;ll see the text and can edit it before
        submitting.
      </p>

      {errorMessage ? (
        <div className="mx-auto max-w-md">
          <ErrorBanner message={errorMessage} />
        </div>
      ) : null}

      <div className="flex justify-center">
        {recording ? (
          <Button size="lg" variant="ghost" onClick={stopRecording}>
            ◼ Stop recording
          </Button>
        ) : (
          <Button
            size="lg"
            variant="clay"
            onClick={() => void startRecording()}
            disabled={transcribingState}
            style={{ backgroundColor: config.brandColor }}
          >
            {transcribingState ? "Transcribing…" : "Record review"}
          </Button>
        )}
      </div>
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2"
      style={{
        border: "1px solid var(--rose)",
        background: "var(--rose-soft)",
        borderRadius: 6,
        padding: "12px 16px",
      }}
    >
      <WarningCircle className="mt-0.5 size-4 text-[var(--rose)]" />
      <p
        className="font-sans m-0 text-sm leading-6 text-[var(--ink)]"
      >
        {message}
      </p>
    </div>
  )
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div
      className="flex flex-wrap gap-2 mt-1"
      role="radiogroup"
      aria-label="Star rating"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = star <= value
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            onClick={() => onChange(star)}
            className={cn(
              "flex size-11 items-center justify-center rounded-full border transition-colors",
              selected
                ? "border-[var(--gold)] bg-[var(--gold-soft)] text-[var(--gold)]"
                : "border-[var(--line)] bg-[var(--card)] text-[var(--ink-3)] hover:text-[var(--ink)]"
            )}
          >
            <Star className="size-5" weight={selected ? "fill" : "regular"} />
          </button>
        )
      })}
    </div>
  )
}
