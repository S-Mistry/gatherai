import type { AnonymityMode, ProjectType } from "@/lib/domain/types"

export const PROJECT_TYPE_ORDER: ProjectType[] = ["discovery", "feedback"]
export const DEFAULT_CREATE_PROJECT_TYPE: ProjectType = "feedback"

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
    participantTitle: "A short conversation before the workshop.",
    participantIntro:
      "Before the live session, the team running this workshop would love to hear what's working, what isn't, and what you would change. I'll ask a few questions and listen carefully.",
    disclosureLines: [
      "I'll listen and write down what you say.",
      "Your voice recording is not saved.",
      "Only the consultant sees the transcript.",
    ],
    completionTitle: "Thanks. That gives the team a clearer starting point.",
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
      "Capture what landed, what missed, and what to improve after an experience, event, service, visit, or purchase.",
    badgeVariant: "success",
    audiencePlural: "respondents",
    anonymousRespondentLabel: "Respondent",
    objective:
      "Capture what landed, what missed, and what should change after the experience.",
    areasOfInterest: [
      "What worked well",
      "What felt unclear, frustrating, or missing",
      "What happened afterwards",
      "What to improve next time",
    ],
    requiredQuestions: [
      "What part of the experience felt most useful or positive to you?",
      "What felt unclear, frustrating, or less useful?",
      "What happened afterwards, if anything?",
      "If we improved this experience, what should we change?",
    ],
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
    toneStyle: "Warm, concise, reflective, researcher-like.",
    followUpLimit: 1,
    participantTitle: "A short conversation about your experience.",
    participantIntro:
      "The team behind this experience would love to hear what worked, what missed, and what to improve next time. I'll ask a few short questions and listen carefully.",
    disclosureLines: [
      "I'll listen and write down what you say.",
      "Your voice recording is not saved.",
      "Only the organizer sees the transcript.",
    ],
    completionTitle: "Thanks. Your feedback is now part of the improvement loop.",
    completionDescription:
      "Your voice isn't saved. The transcript helps the team improve the experience.",
    implicationsLabel: "Improvement implications",
    implicationsEmptyMessage:
      "No grounded improvement implications were captured from this transcript yet.",
    focusAreasLabel: "Recommended focus areas",
    shareHint:
      "Best shared the same day or within 24 hours, while the experience is still fresh.",
  },
}

export function isProjectType(value: unknown): value is ProjectType {
  return value === "discovery" || value === "feedback"
}

export function normalizeProjectType(value: unknown): ProjectType {
  return isProjectType(value) ? value : "discovery"
}

export function resolveCreateProjectType(
  value: unknown,
  discoveryEnabled: boolean
): ProjectType {
  if (value === "discovery" && discoveryEnabled) {
    return "discovery"
  }

  return value === "feedback" ? "feedback" : DEFAULT_CREATE_PROJECT_TYPE
}

export function getCreateProjectTypeOptions(
  discoveryEnabled: boolean
): ProjectType[] {
  return discoveryEnabled ? PROJECT_TYPE_ORDER : ["feedback"]
}

export function getProjectTypePreset(projectType: unknown): ProjectTypePreset {
  return PROJECT_TYPE_PRESETS[normalizeProjectType(projectType)]
}

export function getProjectTypeBadge(projectType: unknown) {
  const preset = getProjectTypePreset(projectType)

  return {
    label: preset.label,
    variant: preset.badgeVariant,
  } as const
}

export function getProjectTypeAudiencePlural(projectType: unknown) {
  return getProjectTypePreset(projectType).audiencePlural
}

export function getAnonymousRespondentLabel(projectType: unknown) {
  return getProjectTypePreset(projectType).anonymousRespondentLabel
}

export function buildParticipantIntro(projectType: unknown) {
  return getProjectTypePreset(projectType).participantIntro
}

export function buildParticipantDisclosure(projectType: unknown) {
  return getProjectTypePreset(projectType).disclosureLines.join("\n")
}
