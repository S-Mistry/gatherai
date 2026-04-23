import type {
  AnonymityMode,
  PublicInterviewConfig,
  ProjectType,
} from "@/lib/domain/types"

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
      "Understand the friction, contradictions, and decisions the team should address next.",
    areasOfInterest: [
      "Current blockers",
      "Decision ownership",
      "Where teams feel aligned or misaligned",
      "What a useful outcome would look like",
    ],
    requiredQuestions: [
      "What outcome would make this useful for you?",
      "Where is the biggest friction today?",
      "What tension, contradiction, or tradeoff should we surface?",
      "What risk should we account for as we plan next steps?",
    ],
    durationCapMinutes: 15,
    anonymityMode: "pseudonymous",
    toneStyle: "Warm, neutral, researcher-like.",
    followUpLimit: 2,
    participantTitle: "A short conversation to help the team prepare.",
    participantIntro:
      "Before the team decides what to do next, they'd love to hear what's working, what isn't, and what you would change. I'll ask a few questions and listen carefully.",
    disclosureLines: [
      "I'll listen and write down what you say.",
      "Your voice recording is not saved.",
      "Only the consultant sees the transcript.",
    ],
    completionTitle: "Thanks. That gives the team a clearer starting point.",
    completionDescription:
      "Your voice isn't saved. The transcript helps the team prepare for what comes next.",
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
    completionTitle:
      "Thanks. Your feedback is now part of the improvement loop.",
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

const LEGACY_DISCOVERY_OBJECTIVES = new Map<string, string>([
  [
    "Capture workshop discovery inputs.",
    PROJECT_TYPE_PRESETS.discovery.objective,
  ],
  [
    "Understand the friction, contradictions, and decisions the upcoming workshop or program needs to address.",
    PROJECT_TYPE_PRESETS.discovery.objective,
  ],
])

const LEGACY_DISCOVERY_REQUIRED_QUESTIONS = new Map<string, string>([
  [
    "What would make this workshop useful for you?",
    PROJECT_TYPE_PRESETS.discovery.requiredQuestions[0],
  ],
  [
    "What would make this workshop or program useful for you?",
    PROJECT_TYPE_PRESETS.discovery.requiredQuestions[0],
  ],
  [
    "What risk should we account for while planning this session?",
    PROJECT_TYPE_PRESETS.discovery.requiredQuestions[3],
  ],
])

const LEGACY_FEEDBACK_OBJECTIVES = new Map<string, string>([
  [
    "Capture what landed, what missed, and what should change after the workshop, course, or program.",
    PROJECT_TYPE_PRESETS.feedback.objective,
  ],
])

const LEGACY_FEEDBACK_REQUIRED_QUESTIONS = new Map<string, string>([
  [
    "What part of the workshop or program was most useful to you?",
    PROJECT_TYPE_PRESETS.feedback.requiredQuestions[0],
  ],
  [
    "What felt unclear, missing, or less useful?",
    PROJECT_TYPE_PRESETS.feedback.requiredQuestions[1],
  ],
  [
    "What changed for you afterwards, if anything?",
    PROJECT_TYPE_PRESETS.feedback.requiredQuestions[2],
  ],
  [
    "If we ran this again, what should we do differently?",
    PROJECT_TYPE_PRESETS.feedback.requiredQuestions[3],
  ],
])

function sanitizeLegacyObjective(projectType: ProjectType, objective: string) {
  const legacyObjectives =
    projectType === "feedback"
      ? LEGACY_FEEDBACK_OBJECTIVES
      : LEGACY_DISCOVERY_OBJECTIVES

  return legacyObjectives.get(objective) ?? objective
}

function sanitizeLegacyRequiredQuestion(
  projectType: ProjectType,
  prompt: string
) {
  const legacyRequiredQuestions =
    projectType === "feedback"
      ? LEGACY_FEEDBACK_REQUIRED_QUESTIONS
      : LEGACY_DISCOVERY_REQUIRED_QUESTIONS

  return legacyRequiredQuestions.get(prompt) ?? prompt
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

export function sanitizePublicInterviewConfig(
  config: PublicInterviewConfig
): PublicInterviewConfig {
  const projectType = normalizeProjectType(config.projectType)

  return {
    ...config,
    projectType,
    objective: sanitizeLegacyObjective(projectType, config.objective),
    requiredQuestions: config.requiredQuestions.map((question) => ({
      ...question,
      prompt: sanitizeLegacyRequiredQuestion(projectType, question.prompt),
    })),
  }
}
