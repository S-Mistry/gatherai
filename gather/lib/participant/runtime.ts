import { isLowSignalUtterance, normalizeSignalText } from "@/lib/analysis/transcript"

export interface InterviewStartSignal {
  kind: "affirmative" | "substantive"
  matchedText: string
}

const AFFIRMATIVE_PATTERNS = [
  /^ready$/,
  /^i am ready$/,
  /^i'?m ready$/,
  /^yes$/,
  /^yeah$/,
  /^yep$/,
  /^okay$/,
  /^ok$/,
  /^sure$/,
  /^sounds good$/,
  /^let'?s go$/,
  /^let us go$/,
  /^go ahead$/,
]

export function detectInterviewStartSignal(text: string): InterviewStartSignal | null {
  const trimmed = text.trim()

  if (!trimmed) {
    return null
  }

  const normalized = normalizeSignalText(trimmed)

  if (AFFIRMATIVE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return {
      kind: "affirmative",
      matchedText: trimmed,
    }
  }

  if (isLowSignalUtterance(trimmed)) {
    return null
  }

  const wordCount = normalized.split(" ").filter(Boolean).length

  if (wordCount >= 5) {
    return {
      kind: "substantive",
      matchedText: trimmed,
    }
  }

  return null
}
