import { env, isBraintrustConfigured } from "@/lib/env"
import type {
  ParticipantSession,
  QualityScore,
  SessionOutputGenerated,
  TranscriptSegment,
} from "@/lib/domain/types"

export interface BraintrustTracePayload {
  session: ParticipantSession
  transcript?: TranscriptSegment[]
  outputs?: SessionOutputGenerated
  score?: QualityScore
}

export async function logBraintrustTrace(payload: BraintrustTracePayload) {
  if (!isBraintrustConfigured) {
    return {
      skipped: true,
      reason: "Braintrust environment variables are not configured.",
      payload,
    }
  }

  return {
    skipped: false,
    project: env.BRAINTRUST_PROJECT,
    payload,
  }
}
