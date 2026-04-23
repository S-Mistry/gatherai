const UUID_PATTERN =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi
const LONG_IDENTIFIER_PATTERN = /\b[a-z0-9]{12,}(?:-[a-z0-9]{4,}){2,}\b/gi

function cleanWarningSource(text?: string | null) {
  return (text ?? "")
    .replace(UUID_PATTERN, "")
    .replace(LONG_IDENTIFIER_PATTERN, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+/g, " ")
    .trim()
}

function finishSentence(text: string) {
  const trimmed = text.trim().replace(/[,:;-\s]+$/g, "")

  if (!trimmed) {
    return undefined
  }

  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

export function formatProjectSynthesisWarning(warning?: string | null) {
  const cleaned = cleanWarningSource(warning)

  if (!cleaned) {
    return undefined
  }

  const normalized = cleaned.toLowerCase()

  if (
    normalized.includes("based mainly on 2 substantive sessions") ||
    normalized.includes("based mainly on two substantive sessions") ||
    normalized.includes("based mainly on two usable sessions") ||
    normalized.includes("ended before usable experience feedback was captured") ||
    normalized.includes("ended before usable feedback was captured") ||
    normalized.includes("no usable experience feedback") ||
    normalized.includes("no usable feedback")
  ) {
    return "Based mainly on two usable sessions, so treat this as directional."
  }

  if (
    normalized.includes("only one completed interview is included") ||
    normalized.includes("only one included session") ||
    normalized.includes("based on one usable session")
  ) {
    return "Based on one usable session, so treat this as directional."
  }

  if (
    normalized.includes("potential themes were detected") ||
    normalized.includes("project-level evidence threshold") ||
    normalized.includes("evidence threshold yet")
  ) {
    return "Potential themes are emerging, but the evidence is still too thin for firm conclusions."
  }

  const firstSentence = cleaned.match(/[^.!?]+[.!?]?/)?.[0] ?? cleaned
  return finishSentence(firstSentence)
}

export function resolveProjectSynthesisWarning({
  rawWarning,
  includedSessionCount,
  themesNeedMoreEvidence,
}: {
  rawWarning?: string | null
  includedSessionCount: number
  themesNeedMoreEvidence: boolean
}) {
  if (includedSessionCount <= 1) {
    return "Based on one usable session, so treat this as directional."
  }

  const formattedRaw = formatProjectSynthesisWarning(rawWarning)

  if (formattedRaw?.startsWith("Based mainly on two usable sessions")) {
    return formattedRaw
  }

  if (themesNeedMoreEvidence) {
    return "Potential themes are emerging, but the evidence is still too thin for firm conclusions."
  }

  return formattedRaw
}
