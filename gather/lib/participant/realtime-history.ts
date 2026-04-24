import type {
  RealtimeItem,
  RealtimeMessageItem,
} from "@openai/agents/realtime"

export type TranscriptPayloadSpeaker = "participant" | "agent"

export interface TranscriptPayloadSegment {
  sourceItemId: string
  speaker: TranscriptPayloadSpeaker
  text: string
}

type RealtimeHistoryContentPart = RealtimeMessageItem["content"][number]
type SessionEventsRuntime = Record<string, unknown>

export interface SessionEventsRequestBody {
  segments?: TranscriptPayloadSegment[]
  runtime?: SessionEventsRuntime
}

export function extractTranscriptParts(
  content: RealtimeHistoryContentPart[] = []
) {
  return content
    .map((part) => {
      if (part.type === "input_text" || part.type === "output_text") {
        return typeof part.text === "string" ? part.text.trim() : ""
      }

      if (part.type === "input_audio" || part.type === "output_audio") {
        return typeof part.transcript === "string" ? part.transcript.trim() : ""
      }

      return ""
    })
    .filter(Boolean)
}

export function extractTranscriptSegments(
  history: RealtimeItem[]
): TranscriptPayloadSegment[] {
  return history.flatMap((item) => {
    if (item.type !== "message" || item.role === "system") {
      return []
    }

    if (item.status !== "completed") {
      return []
    }

    const text = extractTranscriptParts(item.content).join(" ").trim()

    if (!item.itemId || !text) {
      return []
    }

    return [
      {
        sourceItemId: item.itemId,
        speaker: item.role === "user" ? "participant" : "agent",
        text,
      },
    ]
  })
}

export function getLatestTranscriptSegmentForSpeaker(
  history: RealtimeItem[],
  speaker: TranscriptPayloadSpeaker
) {
  const segments = extractTranscriptSegments(history).filter(
    (segment) => segment.speaker === speaker
  )

  return segments[segments.length - 1] ?? null
}

export function selectTranscriptSegmentsForPersist({
  history,
  persistedItemIds,
  inflightItemIds,
}: {
  history: RealtimeItem[]
  persistedItemIds: ReadonlySet<string>
  inflightItemIds: ReadonlySet<string>
}) {
  return extractTranscriptSegments(history).filter((segment) => {
    return (
      !persistedItemIds.has(segment.sourceItemId) &&
      !inflightItemIds.has(segment.sourceItemId)
    )
  })
}

export function buildSessionEventsRequestBody({
  history,
  persistedItemIds,
  inflightItemIds,
  runtime,
}: {
  history: RealtimeItem[]
  persistedItemIds: ReadonlySet<string>
  inflightItemIds: ReadonlySet<string>
  runtime?: SessionEventsRuntime
}) {
  const segments = selectTranscriptSegmentsForPersist({
    history,
    persistedItemIds,
    inflightItemIds,
  })

  if (segments.length === 0 && runtime === undefined) {
    return null
  }

  const body =
    runtime === undefined
      ? { segments }
      : segments.length > 0
        ? { segments, runtime }
        : { runtime }

  return { segments, body }
}
