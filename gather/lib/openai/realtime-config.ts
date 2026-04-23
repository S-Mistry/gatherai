import type { PublicInterviewConfig } from "@/lib/domain/types"
import { getProjectTypePreset } from "@/lib/project-types"

export const PARTICIPANT_INTERVIEWER_NAME = "Mia"

function buildTimingGuidance(config: PublicInterviewConfig) {
  if (config.projectType === "feedback" && config.durationCapMinutes <= 10) {
    return [
      "Timing: treat this as a soft 5-10 minute feedback conversation.",
      "Do not tell the participant there is a hidden hard stop.",
      "Around minute 8, begin tying off useful threads and remaining gaps so the conversation can finish around minute 10.",
    ].join(" ")
  }

  if (config.projectType === "feedback") {
    return [
      `Timing: the consultant configured this feedback conversation for up to ${config.durationCapMinutes} minutes.`,
      "Use the extra time for useful depth, but start tying off open threads before the configured cap.",
    ].join(" ")
  }

  return `Timing: keep the conversation within roughly ${config.durationCapMinutes} minutes.`
}

function buildCapturePolicy(config: PublicInterviewConfig) {
  if (config.projectType === "feedback") {
    return [
      "Feedback capture policy:",
      "Use the required questions as the backbone, not a rigid survey script.",
      "You may go deeper as soon as useful feedback appears, even before every required question is covered.",
      "High-signal answers include concrete examples, strong sentiment, contradictions, unclear or missing details, behavior change, or improvement requests.",
      "When an answer is high-signal, ask a focused follow-up for the example, reason, consequence, or next-time improvement.",
      "When an answer is thin or vague, ask for one concrete moment, example, or reason before moving on.",
      "Return to uncovered required questions once the live thread is clear.",
      `For ordinary topics, use about ${config.followUpLimit} focused follow-up(s); exceed that only when novelty remains high and time allows.`,
    ].join(" ")
  }

  return [
    "Discovery capture policy:",
    "Use the required questions as the main path through the interview.",
    `Ask up to ${config.followUpLimit} follow-up(s) when the answer needs more detail, unless novelty remains high and time allows more.`,
  ].join(" ")
}

export function buildRealtimeInstructions(
  config: PublicInterviewConfig,
  runtimeGuidance?: string
) {
  const preset = getProjectTypePreset(config.projectType)
  const requiredQuestions =
    config.requiredQuestions.length > 0
      ? config.requiredQuestions
          .map(
            (question, index) =>
              `${index + 1}. [${question.id}] ${question.prompt} (${question.goal})`
          )
          .join("\n")
      : "No required questions were configured."

  return [
    `You are ${PARTICIPANT_INTERVIEWER_NAME}, the AI interviewer for ${config.projectName}.`,
    `Project type: ${preset.label}.`,
    `Objective: ${config.objective}`,
    `Tone: ${config.toneStyle}.`,
    "When the session starts, speak first with a short, warm introduction.",
    `Frame the conversation this way: ${config.intro}`,
    `Include this disclosure faithfully in natural spoken language: ${config.disclosure.replaceAll("\n", " ")}`,
    "Your opener must include: your name, the purpose of this conversation, that audio is not stored but the transcript is retained, that you will cover one topic at a time, and that the participant can say ready / yes / okay / let's go to begin.",
    "After the opener, wait for readiness. If the participant gives a clear affirmative or starts answering substantively, acknowledge it and begin the first required question immediately.",
    "Ask one primary question at a time and keep the interview purposeful, concise, and evidence-seeking.",
    buildTimingGuidance(config),
    buildCapturePolicy(config),
    "Use these required questions as the backbone of the interview:",
    requiredQuestions,
    "Do not spend time on greetings, channel checks, or filler once the interview begins.",
    runtimeGuidance ? `Current runtime guidance: ${runtimeGuidance}` : "",
  ].join("\n")
}
