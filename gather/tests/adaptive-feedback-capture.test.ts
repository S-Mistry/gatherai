import assert from "node:assert/strict"
import test from "node:test"

import type { PublicInterviewConfig } from "../lib/domain/types"
import {
  createProjectFromForm,
  getPublicInterviewConfig,
} from "../lib/data/mock"
import {
  PARTICIPANT_INTERVIEWER_FINAL_LINE,
  buildRealtimeInstructions,
  isParticipantInterviewerFinalLine,
} from "../lib/openai/realtime-config"
import {
  deriveCaptureMonitorSnapshot,
  type CaptureTurn,
} from "../lib/participant/capture-monitor"
import { getParticipantDurationCopy } from "../lib/participant/time-copy"
import { getProjectTypePreset } from "../lib/project-types"

const feedbackConfig: PublicInterviewConfig = {
  projectId: "project-feedback",
  projectType: "feedback",
  projectName: "Saturday dinner feedback",
  objective:
    "Capture what worked, what missed, and what to improve after dinner service.",
  durationCapMinutes: 6,
  anonymityMode: "anonymous",
  toneStyle: "Warm, concise, reflective, researcher-like.",
  followUpLimit: 1,
  intro: "We would love to understand what landed and what missed.",
  disclosure: "Only the transcript is retained.",
  areasOfInterest: ["What worked", "What to improve"],
  requiredQuestions: [
    {
      id: "q-useful",
      prompt: "What part of the dining experience felt most positive to you?",
      goal: "Capture what worked.",
    },
    {
      id: "q-unclear",
      prompt: "What felt unclear, frustrating, or less useful?",
      goal: "Capture gaps.",
    },
    {
      id: "q-changed",
      prompt: "What happened afterwards, if anything?",
      goal: "Capture behavior change.",
    },
    {
      id: "q-different",
      prompt: "If we improved this experience, what should we change?",
      goal: "Capture improvements.",
    },
  ],
  metadataPrompts: [],
}

test("feedback realtime instructions include adaptive probing policy", () => {
  const instructions = buildRealtimeInstructions(feedbackConfig)

  assert.match(instructions, /backbone, not a rigid survey script/)
  assert.match(instructions, /High-signal answers include/)
  assert.match(
    instructions,
    /5-10 minute post-experience feedback conversation/
  )
  assert.match(instructions, /about 1 focused follow-up/)
  assert.match(
    instructions,
    /Do not assume this was a workshop, course, or program/
  )
  assert.match(
    instructions,
    /final spoken line must be exactly: Thanks for sharing that\. We're finished now\./
  )
})

test("participant interviewer final line matcher tolerates casing and punctuation", () => {
  assert.equal(
    isParticipantInterviewerFinalLine(
      "THANKS for sharing that we're finished now"
    ),
    true
  )
  assert.equal(
    isParticipantInterviewerFinalLine(PARTICIPANT_INTERVIEWER_FINAL_LINE),
    true
  )
  assert.equal(
    isParticipantInterviewerFinalLine("Thanks for sharing that. We are done."),
    false
  )
})

test("feedback duration copy uses soft default and configured upper bounds", () => {
  const defaultCopy = getParticipantDurationCopy("feedback", 6)
  const customCopy = getParticipantDurationCopy("feedback", 15)
  const discoveryCopy = getParticipantDurationCopy("discovery", 15)

  assert.equal(defaultCopy.timerTargetLabel, "5-10 min")
  assert.equal(defaultCopy.shellLabel, "About 5-10 minutes.")
  assert.equal(customCopy.timerTargetLabel, "up to 15 min")
  assert.equal(customCopy.shellLabel, "Up to 15 minutes.")
  assert.equal(discoveryCopy.timerTargetLabel, "~15 min")
})

test("mock public interview config exposes follow-up policy", () => {
  const { project, configVersion } = createProjectFromForm({
    projectType: "feedback",
    name: "Feedback config test",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  })
  const publicConfig = getPublicInterviewConfig(project.publicLinkToken)

  assert.equal(configVersion.followUpLimit, 1)
  assert.equal(publicConfig?.projectType, "feedback")
  assert.equal(publicConfig?.followUpLimit, 1)
})

test("mock public interview config sanitizes legacy discovery starter copy", () => {
  const { project } = createProjectFromForm({
    projectType: "discovery",
    name: "Legacy discovery copy",
    objective:
      "Understand the friction, contradictions, and decisions the upcoming workshop or program needs to address.",
    areasOfInterest: "",
    requiredQuestions: [
      "What would make this workshop or program useful for you?",
      "Where is the biggest friction today?",
      "What tension, contradiction, or tradeoff should we surface?",
      "What risk should we account for while planning this session?",
    ].join("\n"),
    durationCapMinutes: 15,
    anonymityMode: "pseudonymous",
  })
  const publicConfig = getPublicInterviewConfig(project.publicLinkToken)
  const discoveryPreset = getProjectTypePreset("discovery")

  assert.equal(publicConfig?.objective, discoveryPreset.objective)
  assert.equal(
    publicConfig?.requiredQuestions[0]?.prompt,
    discoveryPreset.requiredQuestions[0]
  )
  assert.equal(
    publicConfig?.requiredQuestions[3]?.prompt,
    discoveryPreset.requiredQuestions[3]
  )
})

test("mock public interview config sanitizes legacy feedback starter copy", () => {
  const { project } = createProjectFromForm({
    projectType: "feedback",
    name: "Legacy feedback copy",
    objective:
      "Capture what landed, what missed, and what should change after the workshop, course, or program.",
    areasOfInterest: "",
    requiredQuestions: [
      "What part of the workshop or program was most useful to you?",
      "What felt unclear, missing, or less useful?",
      "What changed for you afterwards, if anything?",
      "If we ran this again, what should we do differently?",
    ].join("\n"),
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  })
  const publicConfig = getPublicInterviewConfig(project.publicLinkToken)
  const feedbackPreset = getProjectTypePreset("feedback")

  assert.equal(publicConfig?.objective, feedbackPreset.objective)
  assert.equal(
    publicConfig?.requiredQuestions[0]?.prompt,
    feedbackPreset.requiredQuestions[0]
  )
  assert.equal(
    publicConfig?.requiredQuestions[3]?.prompt,
    feedbackPreset.requiredQuestions[3]
  )
})

test("mock public interview config preserves consultant-authored workshop wording", () => {
  const customObjective = "Capture what the workshop debrief should fix next."
  const customQuestion = "What did the workshop miss for you?"
  const { project } = createProjectFromForm({
    projectType: "feedback",
    name: "Custom workshop copy",
    objective: customObjective,
    areasOfInterest: "",
    requiredQuestions: customQuestion,
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  })
  const publicConfig = getPublicInterviewConfig(project.publicLinkToken)

  assert.equal(publicConfig?.objective, customObjective)
  assert.equal(publicConfig?.requiredQuestions[0]?.prompt, customQuestion)
})

test("capture monitor detects high-signal feedback and likely asked questions", () => {
  const turns: CaptureTurn[] = [
    {
      sourceItemId: "agent-1",
      speaker: "agent",
      text: "What part of the dining experience felt most positive to you?",
    },
    {
      sourceItemId: "participant-1",
      speaker: "participant",
      text: "The live practice was the most useful because it mirrored a real conversation with my team. I started using the debrief template the next day, but the worksheet arrived too late to prepare properly.",
    },
  ]
  const snapshot = deriveCaptureMonitorSnapshot({
    config: feedbackConfig,
    turns,
    elapsedSeconds: 120,
    interviewStarted: true,
  })

  assert.deepEqual(snapshot.askedQuestionIds, ["q-useful"])
  assert.equal(snapshot.remainingQuestionIds.length, 3)
  assert.equal(snapshot.latestParticipantSignal, "high_signal")
  assert.equal(snapshot.shouldCoach, true)
  assert.match(snapshot.coachingInstructions ?? "", /one focused follow-up/)
})

test("capture monitor detects thin feedback and wrap-up pressure", () => {
  const turns: CaptureTurn[] = [
    {
      sourceItemId: "agent-1",
      speaker: "agent",
      text: "What felt unclear, missing, or less useful?",
    },
    {
      sourceItemId: "participant-1",
      speaker: "participant",
      text: "It was fine.",
    },
  ]
  const thinSnapshot = deriveCaptureMonitorSnapshot({
    config: feedbackConfig,
    turns,
    elapsedSeconds: 180,
    interviewStarted: true,
  })
  const wrapSnapshot = deriveCaptureMonitorSnapshot({
    config: feedbackConfig,
    turns,
    elapsedSeconds: 8 * 60,
    interviewStarted: true,
  })

  assert.equal(thinSnapshot.latestParticipantSignal, "thin")
  assert.match(thinSnapshot.coachingInstructions ?? "", /thin or vague/)
  assert.equal(wrapSnapshot.wrapUpPressure, true)
  assert.match(wrapSnapshot.coachingInstructions ?? "", /wrap-up window/)
})
