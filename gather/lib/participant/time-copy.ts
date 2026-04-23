import type { ProjectType } from "@/lib/domain/types"

export interface ParticipantDurationCopy {
  introSentence: string
  shellLabel: string
  timerTargetLabel: string
  timerAriaDescription: string
}

function normalizeDuration(durationCapMinutes: number) {
  return Math.max(1, Math.round(durationCapMinutes))
}

export function getParticipantDurationCopy(
  projectType: ProjectType,
  durationCapMinutes: number
): ParticipantDurationCopy {
  const duration = normalizeDuration(durationCapMinutes)

  if (projectType === "feedback" && duration <= 10) {
    return {
      introSentence: "This usually takes 5-10 minutes.",
      shellLabel: "About 5-10 minutes.",
      timerTargetLabel: "5-10 min",
      timerAriaDescription:
        "typical feedback conversations run 5 to 10 minutes",
    }
  }

  if (projectType === "feedback") {
    return {
      introSentence: `This can take up to ${duration} minutes.`,
      shellLabel: `Up to ${duration} minutes.`,
      timerTargetLabel: `up to ${duration} min`,
      timerAriaDescription: `this feedback conversation can take up to ${duration} minutes`,
    }
  }

  return {
    introSentence: `This takes about ${duration} minutes.`,
    shellLabel: `About ${duration} minutes.`,
    timerTargetLabel: `~${duration} min`,
    timerAriaDescription: `this conversation takes roughly ${duration} minutes`,
  }
}
