import type { AnonymityMode, ProjectType } from "@/lib/domain/types"

export const PROJECT_TYPE_ORDER: ProjectType[] = ["discovery", "feedback"]

export interface ProjectTypePreset {
  label: string
  description: string
  badgeVariant: "accent" | "success"
  audiencePlural: string
  anonymousRespondentLabel: string
  objective: string
  areasOfInterest: string[]
  requiredQuestions: string[]
  durationCapMinutes: number
  anonymityMode: AnonymityMode
  toneStyle: string
  followUpLimit: number
  participantTitle: string
  participantIntro: string
  disclosureLines: string[]
  completionTitle: string
  completionDescription: string
  implicationsLabel: string
  implicationsEmptyMessage: string
  focusAreasLabel: string
  shareHint?: string
}

const PROJECT_TYPE_PRESETS: Record<ProjectType, ProjectTypePreset> = {
  discovery: {
    label: "Discovery",
    description:
      "Understand needs, blockers, and tensions before the upcoming workshop or program.",
    badgeVariant: "accent",
    audiencePlural: "stakeholders",
    anonymousRespondentLabel: "Stakeholder",
    objective:
      "Understand the friction, contradictions, and decisions the upcoming workshop or program needs to address.",
    areasOfInterest: [
      "Current blockers",
      "Decision ownership",
      "Where teams feel aligned or misaligned",
      "What a useful outcome would look like",
    ],
    requiredQuestions: [
      "What would make this workshop or program useful for you?",
      "Where is the biggest friction today?",
      "What tension, contradiction, or tradeoff should we surface?",
      "What risk should we account for while planning this session?",
    ],
    durationCapMinutes: 15,
    anonymityMode: "pseudonymous",
    toneStyle: "Warm, neutral, researcher-like.",
    followUpLimit: 2,
    participantTitle: "Before the workshop — a short conversation.",
    participantIntro:
      "Before the live session, the team running this workshop would love to hear what's working, what isn't, and what you would change. I'll ask a few questions and listen carefully.",
    disclosureLines: [
      "I'll listen and write down what you say.",
      "Your voice recording is not saved.",
      "Only the consultant sees the transcript.",
    ],
    completionTitle: "Thanks — that gives the team a clearer starting point.",
    completionDescription:
      "Your voice isn't saved. The transcript helps shape the upcoming workshop or program.",
    implicationsLabel: "Workshop implications",
    implicationsEmptyMessage:
      "No workshop implications were grounded from this transcript yet.",
    focusAreasLabel: "Suggested agenda",
  },
  feedback: {
    label: "Feedback",
    description:
      "Capture what landed, what missed, and what to improve after a completed workshop, course, or program.",
    badgeVariant: "success",
    audiencePlural: "participants",
    anonymousRespondentLabel: "Participant",
    objective:
      "Capture what landed, what missed, and what should change after the workshop, course, or program.",
    areasOfInterest: [
      "What worked well",
      "What felt unclear or missing",
      "What changed afterwards",
      "What to improve next time",
    ],
    requiredQuestions: [
      "What part of the workshop or program was most useful to you?",
      "What felt unclear, missing, or less useful?",
      "What changed for you afterwards, if anything?",
      "If we ran this again, what should we do differently?",
    ],
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
    toneStyle: "Warm, concise, reflective, researcher-like.",
    followUpLimit: 1,
    participantTitle: "A short reflection after the program.",
    participantIntro:
      "The team behind this workshop or program would love to hear what landed, what missed, and what to improve next time. I'll ask a few short questions and listen.",
    disclosureLines: [
      "I'll listen and write down what you say.",
      "Your voice recording is not saved.",
      "Only the organizer sees the transcript.",
    ],
    completionTitle: "Thanks — that feedback is now part of the improvement loop.",
    completionDescription:
      "Your voice isn't saved. The transcript helps improve the next round of the program.",
    implicationsLabel: "Program implications",
    implicationsEmptyMessage:
      "No program implications were grounded from this transcript yet.",
    focusAreasLabel: "Recommended focus areas",
    shareHint:
      "Best shared the same day or within 24 hours, while the experience is still fresh.",
  },
}

export function isProjectType(value: unknown): value is ProjectType {
  return value === "discovery" || value === "feedback"
}

export function getProjectTypePreset(projectType: ProjectType): ProjectTypePreset {
  return PROJECT_TYPE_PRESETS[projectType]
}

export function getProjectTypeBadge(projectType: ProjectType) {
  const preset = getProjectTypePreset(projectType)

  return {
    label: preset.label,
    variant: preset.badgeVariant,
  } as const
}

export function getProjectTypeAudiencePlural(projectType: ProjectType) {
  return getProjectTypePreset(projectType).audiencePlural
}

export function getAnonymousRespondentLabel(projectType: ProjectType) {
  return getProjectTypePreset(projectType).anonymousRespondentLabel
}

export function buildParticipantIntro(projectType: ProjectType) {
  return getProjectTypePreset(projectType).participantIntro
}

export function buildParticipantDisclosure(projectType: ProjectType) {
  return getProjectTypePreset(projectType).disclosureLines.join("\n")
}
