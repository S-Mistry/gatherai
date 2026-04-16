import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

import { buildDeterministicQualitySnapshot } from "../lib/analysis/quality"
import {
  buildAnalysisTranscriptBlocks,
  buildIncludedSessionOutputSet,
  ensureSessionEvidenceRefs,
  listParticipantInsightSegmentIds,
} from "../lib/analysis/transcript"

async function loadFixture<T>(name: string): Promise<T> {
  const url = new URL(`./fixtures/${name}`, import.meta.url)
  const contents = await readFile(url, "utf8")
  return JSON.parse(contents) as T
}

test("analysis fixtures ignore greeting-only participant turns", async () => {
  const fixture = await loadFixture<{
    transcript: Array<Record<string, unknown>>
  }>("session-analysis.json")

  const blocks = buildAnalysisTranscriptBlocks(fixture.transcript as never)
  const greetingBlock = blocks.find((block) =>
    block.segmentIds.includes("seg-participant-1")
  )
  const evidenceBlock = blocks.find((block) =>
    block.segmentIds.includes("seg-participant-2")
  )

  assert.ok(greetingBlock)
  assert.equal(greetingBlock?.lowSignal, true)
  assert.ok(evidenceBlock)
  assert.equal(evidenceBlock?.lowSignal, false)
})

test("analysis fixtures only allow meaningful participant evidence", async () => {
  const fixture = await loadFixture<{
    transcript: Array<Record<string, unknown>>
  }>("session-analysis.json")

  const validSegmentIds = listParticipantInsightSegmentIds(
    buildAnalysisTranscriptBlocks(fixture.transcript as never)
  )
  const evidence = ensureSessionEvidenceRefs(
    "sess-1",
    [
      {
        segmentIds: ["seg-participant-1"],
        rationale: "Greeting evidence should be dropped.",
      },
      {
        segmentIds: ["seg-participant-2", "seg-participant-3"],
        rationale: "Substantive evidence should survive.",
      },
    ],
    validSegmentIds
  )

  assert.deepEqual(evidence, [
    {
      sessionId: "sess-1",
      segmentIds: ["seg-participant-2", "seg-participant-3"],
      rationale: "Substantive evidence should survive.",
    },
  ])
})

test("analysis fixtures filter synthesis inputs to completed non-excluded sessions", async () => {
  const fixture = await loadFixture<{
    sessions: Array<Record<string, unknown>>
    outputs: Array<Record<string, unknown>>
  }>("synthesis-filter.json")

  const includedOutputs = buildIncludedSessionOutputSet(
    fixture.sessions as never,
    fixture.outputs as never
  )

  assert.deepEqual(
    includedOutputs.map((output) => output.sessionId),
    ["sess-a"]
  )
})

test("analysis fixtures compute deterministic quality from evidence-backed output", async () => {
  const fixture = await loadFixture<{
    config: Record<string, unknown>
    transcript: Array<Record<string, unknown>>
    output: Record<string, unknown>
  }>("session-analysis.json")

  const snapshot = buildDeterministicQualitySnapshot(
    fixture.config as never,
    fixture.transcript as never,
    fixture.output as never
  )

  assert.equal(snapshot.coverage, 0.5)
  assert.equal(snapshot.evidenceCompleteness, 1)
  assert.ok(snapshot.specificity > 0.1)
})
