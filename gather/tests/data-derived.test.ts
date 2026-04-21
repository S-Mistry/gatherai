import assert from "node:assert/strict"
import test from "node:test"

import {
  buildRecentNeedsReviewSessions,
  buildSessionMetrics,
  groupByProjectId,
  selectLatestRowsBySessionId,
} from "../lib/data/derived"

test("data-derived groups sessions and computes project metrics in one pass", () => {
  const sessions = [
    {
      id: "sess-1",
      projectId: "proj-a",
      respondentLabel: "A",
      status: "complete" as const,
      qualityFlag: false,
      excludedFromSynthesis: false,
      lastActivityAt: "2026-04-18T09:00:00.000Z",
    },
    {
      id: "sess-2",
      projectId: "proj-a",
      respondentLabel: "B",
      status: "in_progress" as const,
      qualityFlag: true,
      excludedFromSynthesis: false,
      lastActivityAt: "2026-04-18T10:00:00.000Z",
    },
    {
      id: "sess-3",
      projectId: "proj-a",
      respondentLabel: "C",
      status: "abandoned" as const,
      qualityFlag: false,
      excludedFromSynthesis: true,
      lastActivityAt: "2026-04-18T08:00:00.000Z",
    },
  ]

  const grouped = groupByProjectId(sessions)
  const metrics = buildSessionMetrics(grouped.get("proj-a") ?? [])

  assert.equal(grouped.get("proj-a")?.length, 3)
  assert.deepEqual(metrics, {
    inProgress: 1,
    completed: 1,
    abandoned: 1,
    flagged: 1,
    includedInSynthesis: 1,
  })
})

test("data-derived builds recent needs-review sessions from filtered completed sessions", () => {
  const sessions = [
    {
      id: "sess-1",
      projectId: "proj-a",
      respondentLabel: "A",
      status: "complete" as const,
      qualityFlag: true,
      excludedFromSynthesis: false,
      lastActivityAt: "2026-04-18T10:00:00.000Z",
    },
    {
      id: "sess-2",
      projectId: "proj-b",
      respondentLabel: "B",
      status: "complete" as const,
      qualityFlag: true,
      excludedFromSynthesis: true,
      lastActivityAt: "2026-04-18T11:00:00.000Z",
    },
    {
      id: "sess-3",
      projectId: "proj-b",
      respondentLabel: "C",
      status: "in_progress" as const,
      qualityFlag: true,
      excludedFromSynthesis: false,
      lastActivityAt: "2026-04-18T12:00:00.000Z",
    },
    {
      id: "sess-4",
      projectId: "proj-b",
      respondentLabel: "D",
      status: "complete" as const,
      qualityFlag: true,
      excludedFromSynthesis: false,
      lastActivityAt: "2026-04-18T13:00:00.000Z",
    },
  ]

  const result = buildRecentNeedsReviewSessions(
    sessions,
    new Map([
      ["proj-a", "Project A"],
      ["proj-b", "Project B"],
    ])
  )

  assert.deepEqual(
    result.map((session) => session.sessionId),
    ["sess-4", "sess-1"]
  )
  assert.deepEqual(
    result.map((session) => session.projectName),
    ["Project B", "Project A"]
  )
})

test("data-derived selects only the latest generated row per session", () => {
  const rows = [
    {
      sessionId: "sess-a",
      createdAt: "2026-04-18T09:00:00.000Z",
      value: "older-a",
    },
    {
      sessionId: "sess-b",
      createdAt: "2026-04-18T09:15:00.000Z",
      value: "only-b",
    },
    {
      sessionId: "sess-a",
      createdAt: "2026-04-18T09:30:00.000Z",
      value: "latest-a",
    },
  ]

  const latest = selectLatestRowsBySessionId(rows)
    .sort((left, right) => left.sessionId.localeCompare(right.sessionId))

  assert.deepEqual(latest, [
    {
      sessionId: "sess-a",
      createdAt: "2026-04-18T09:30:00.000Z",
      value: "latest-a",
    },
    {
      sessionId: "sess-b",
      createdAt: "2026-04-18T09:15:00.000Z",
      value: "only-b",
    },
  ])
})
