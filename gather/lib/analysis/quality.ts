import type {
  ProjectConfigVersion,
  SessionOutputGenerated,
  TranscriptSegment,
} from "@/lib/domain/types"

import {
  buildAnalysisTranscriptBlocks,
  clampScore,
  countEvidenceBackedClaims,
  normalizeSignalText,
  roundScore,
} from "./transcript"

export interface DeterministicQualitySnapshot {
  coverage: number
  specificity: number
  repetition: number
  transcriptSufficiency: number
  evidenceCompleteness: number
  meaningfulParticipantTurns: number
  meaningfulCharacterCount: number
}

export function buildDeterministicQualitySnapshot(
  config: ProjectConfigVersion,
  transcript: TranscriptSegment[],
  output: SessionOutputGenerated
): DeterministicQualitySnapshot {
  const participantBlocks = buildAnalysisTranscriptBlocks(transcript).filter(
    (block) => block.speaker === "participant" && !block.lowSignal
  )
  const meaningfulTexts = participantBlocks.map((block) => block.text.trim()).filter(Boolean)
  const meaningfulCharacterCount = meaningfulTexts.reduce(
    (count, text) => count + text.length,
    0
  )
  const answeredQuestionIds = new Set(
    output.questionAnswers
      .filter((answer) => answer.evidence.length > 0 && answer.answer.trim().length > 0)
      .map((answer) => answer.questionId)
  )
  const normalizedParticipantTexts = meaningfulTexts
    .map((text) => normalizeSignalText(text))
    .filter(Boolean)
  const uniqueTurns = new Set(normalizedParticipantTexts).size
  const repeatedTurnPenalty =
    normalizedParticipantTexts.length <= 1
      ? 1
      : uniqueTurns / normalizedParticipantTexts.length
  const { totalClaims, claimsWithEvidence } = countEvidenceBackedClaims(output)

  return {
    coverage: roundScore(
      config.requiredQuestions.length > 0
        ? answeredQuestionIds.size / config.requiredQuestions.length
        : 1
    ),
    specificity: roundScore(meaningfulCharacterCount / 900),
    repetition: roundScore(clampScore(repeatedTurnPenalty, 0.15, 1)),
    transcriptSufficiency: roundScore(meaningfulCharacterCount / 700),
    evidenceCompleteness: roundScore(
      totalClaims > 0 ? claimsWithEvidence / totalClaims : meaningfulTexts.length > 0 ? 1 : 0
    ),
    meaningfulParticipantTurns: meaningfulTexts.length,
    meaningfulCharacterCount,
  }
}
