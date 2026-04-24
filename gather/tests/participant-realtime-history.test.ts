import assert from "node:assert/strict"
import test from "node:test"

import type { RealtimeItem } from "@openai/agents/realtime"

import {
  buildSessionEventsRequestBody,
  extractTranscriptParts,
  extractTranscriptSegments,
  getLatestTranscriptSegmentForSpeaker,
} from "../lib/participant/realtime-history"

test("extractTranscriptParts collects trimmed text and transcripts only", () => {
  const parts = [
    { type: "input_text", text: "  hello  " },
    { type: "output_audio", transcript: "  welcome back  " },
    { type: "input_audio", transcript: "" },
    { type: "output_text", text: "  " },
    { type: "refusal" },
  ] as unknown as Parameters<typeof extractTranscriptParts>[0]

  assert.deepEqual(extractTranscriptParts(parts), ["hello", "welcome back"])
})

test("extractTranscriptSegments ignores unsupported history items and maps roles", () => {
  const history = [
    {
      type: "message",
      role: "system",
      status: "completed",
      itemId: "sys-1",
      content: [{ type: "output_text", text: "ignore me" }],
    },
    {
      type: "message",
      role: "user",
      status: "completed",
      itemId: "user-1",
      content: [
        { type: "input_text", text: "  hi  " },
        { type: "input_audio", transcript: "  there  " },
      ],
    },
    {
      type: "message",
      role: "assistant",
      status: "in_progress",
      itemId: "assistant-1",
      content: [{ type: "output_text", text: "not done yet" }],
    },
    {
      type: "message",
      role: "assistant",
      status: "completed",
      itemId: "assistant-2",
      content: [
        { type: "output_audio", transcript: "  Thanks " },
        { type: "output_text", text: " for sharing. " },
      ],
    },
    {
      type: "message",
      role: "assistant",
      status: "completed",
      itemId: "",
      content: [{ type: "output_text", text: "missing id" }],
    },
  ] as unknown as RealtimeItem[]

  assert.deepEqual(extractTranscriptSegments(history), [
    {
      sourceItemId: "user-1",
      speaker: "participant",
      text: "hi there",
    },
    {
      sourceItemId: "assistant-2",
      speaker: "agent",
      text: "Thanks for sharing.",
    },
  ])
})

test("getLatestTranscriptSegmentForSpeaker returns the latest completed turn for a speaker", () => {
  const history = [
    {
      type: "message",
      role: "user",
      status: "completed",
      itemId: "user-1",
      content: [{ type: "input_text", text: "First answer" }],
    },
    {
      type: "message",
      role: "assistant",
      status: "completed",
      itemId: "assistant-1",
      content: [{ type: "output_text", text: "Thanks" }],
    },
    {
      type: "message",
      role: "user",
      status: "completed",
      itemId: "user-2",
      content: [{ type: "input_audio", transcript: "Second answer" }],
    },
  ] as unknown as RealtimeItem[]

  assert.deepEqual(getLatestTranscriptSegmentForSpeaker(history, "participant"), {
    sourceItemId: "user-2",
    speaker: "participant",
    text: "Second answer",
  })
  assert.deepEqual(getLatestTranscriptSegmentForSpeaker(history, "agent"), {
    sourceItemId: "assistant-1",
    speaker: "agent",
    text: "Thanks",
  })
})

test("buildSessionEventsRequestBody dedupes persisted and inflight transcript segments", () => {
  const history = [
    {
      type: "message",
      role: "user",
      status: "completed",
      itemId: "user-1",
      content: [{ type: "input_text", text: "Already saved" }],
    },
    {
      type: "message",
      role: "assistant",
      status: "completed",
      itemId: "assistant-1",
      content: [{ type: "output_text", text: "In flight" }],
    },
    {
      type: "message",
      role: "user",
      status: "completed",
      itemId: "user-2",
      content: [{ type: "input_text", text: "New turn" }],
    },
  ] as unknown as RealtimeItem[]

  const persistPlan = buildSessionEventsRequestBody({
    history,
    persistedItemIds: new Set(["user-1"]),
    inflightItemIds: new Set(["assistant-1"]),
    runtime: { state: "intro" },
  })

  assert.deepEqual(persistPlan, {
    segments: [
      {
        sourceItemId: "user-2",
        speaker: "participant",
        text: "New turn",
      },
    ],
    body: {
      segments: [
        {
          sourceItemId: "user-2",
          speaker: "participant",
          text: "New turn",
        },
      ],
      runtime: { state: "intro" },
    },
  })
})

test("buildSessionEventsRequestBody returns a runtime-only payload when no new segments remain", () => {
  const history = [
    {
      type: "message",
      role: "assistant",
      status: "completed",
      itemId: "assistant-1",
      content: [{ type: "output_text", text: "Already saved" }],
    },
  ] as unknown as RealtimeItem[]

  const persistPlan = buildSessionEventsRequestBody({
    history,
    persistedItemIds: new Set(["assistant-1"]),
    inflightItemIds: new Set(),
    runtime: { state: "paused" },
  })

  assert.deepEqual(persistPlan, {
    segments: [],
    body: { runtime: { state: "paused" } },
  })
})
