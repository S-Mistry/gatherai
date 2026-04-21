import assert from "node:assert/strict"
import test from "node:test"

import { appendSessionEvents } from "../lib/data/mock"

function resetMockStore() {
  ;(
    globalThis as typeof globalThis & {
      __gatheraiMockStore?: unknown
    }
  ).__gatheraiMockStore = undefined
}

test("mock session events dedupe repeated source item ids and preserve ordering", () => {
  resetMockStore()

  const firstAppend = appendSessionEvents("sess-amelia", {
    segments: [
      {
        sourceItemId: "item-1",
        speaker: "participant",
        text: "First answer.",
      },
      {
        sourceItemId: "item-1",
        speaker: "participant",
        text: "Duplicate retry should be ignored.",
      },
      {
        sourceItemId: "item-2",
        speaker: "agent",
        text: "Follow-up prompt.",
      },
      {
        speaker: "participant",
        text: "Segments without source ids still append.",
      },
    ],
  })

  assert.ok(firstAppend)
  assert.equal(firstAppend?.length, 3)
  assert.deepEqual(
    firstAppend?.map((segment) => segment.sourceItemId ?? null),
    ["item-1", "item-2", null]
  )
  assert.deepEqual(
    firstAppend?.map((segment) => segment.orderIndex),
    [6, 7, 8]
  )

  const secondAppend = appendSessionEvents("sess-amelia", {
    segments: [
      {
        sourceItemId: "item-2",
        speaker: "agent",
        text: "Duplicate agent retry should be ignored.",
      },
      {
        sourceItemId: "item-3",
        speaker: "participant",
        text: "Fresh answer should append after existing rows.",
      },
    ],
  })

  assert.ok(secondAppend)
  assert.equal(secondAppend?.length, 1)
  assert.equal(secondAppend?.[0]?.sourceItemId, "item-3")
  assert.equal(secondAppend?.[0]?.orderIndex, 9)
})
