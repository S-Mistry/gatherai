import assert from "node:assert/strict"
import test from "node:test"

import {
  buildProjectMotionState,
  buildRecentNeedsReviewSessions,
  buildSessionMetrics,
  buildTestimonialProjectMetrics,
  groupByProjectId,
  selectLatestRowsBySessionId,
} from "../lib/data/derived"

const motionNow = new Date("2026-04-29T12:00:00.000Z")
const oldActivityAt = "2026-04-18T12:00:00.000Z"
const recentActivityAt = "2026-04-27T12:00:00.000Z"

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

test("data-derived keeps old pending testimonial reviews in motion", () => {
  const testimonialMetrics = buildTestimonialProjectMetrics({
    projectUpdatedAt: oldActivityAt,
    reviews: [
      {
        status: "pending",
        createdAt: oldActivityAt,
        updatedAt: oldActivityAt,
      },
    ],
  })

  const state = buildProjectMotionState({
    projectType: "testimonial",
    status: "draft",
    updatedAt: oldActivityAt,
    sessions: [],
    testimonialMetrics,
    now: motionNow,
  })

  assert.equal(state.isInMotion, true)
  assert.equal(state.reason, "testimonial_pending")
})

test("data-derived returns approved or rejected testimonials to quiet after one week", () => {
  const approved = buildProjectMotionState({
    projectType: "testimonial",
    status: "draft",
    updatedAt: oldActivityAt,
    sessions: [],
    testimonialMetrics: buildTestimonialProjectMetrics({
      projectUpdatedAt: oldActivityAt,
      reviews: [
        {
          status: "approved",
          createdAt: oldActivityAt,
          updatedAt: oldActivityAt,
        },
      ],
    }),
    now: motionNow,
  })
  const rejected = buildProjectMotionState({
    projectType: "testimonial",
    status: "draft",
    updatedAt: oldActivityAt,
    sessions: [],
    testimonialMetrics: buildTestimonialProjectMetrics({
      projectUpdatedAt: oldActivityAt,
      reviews: [
        {
          status: "rejected",
          createdAt: oldActivityAt,
          updatedAt: oldActivityAt,
        },
      ],
    }),
    now: motionNow,
  })

  assert.equal(approved.isInMotion, false)
  assert.equal(rejected.isInMotion, false)
})

test("data-derived treats new testimonial review activity as in motion", () => {
  const testimonialMetrics = buildTestimonialProjectMetrics({
    projectUpdatedAt: oldActivityAt,
    reviews: [
      {
        status: "approved",
        createdAt: recentActivityAt,
        updatedAt: recentActivityAt,
      },
    ],
  })

  const state = buildProjectMotionState({
    projectType: "testimonial",
    status: "draft",
    updatedAt: oldActivityAt,
    sessions: [],
    testimonialMetrics,
    now: motionNow,
  })

  assert.equal(state.isInMotion, true)
  assert.equal(state.reason, "testimonial_recent_activity")
})

test("data-derived keeps feedback projects in motion while live or synthesizing", () => {
  const live = buildProjectMotionState({
    projectType: "feedback",
    status: "draft",
    updatedAt: oldActivityAt,
    sessions: [
      {
        projectId: "proj-a",
        status: "in_progress",
        qualityFlag: false,
        excludedFromSynthesis: false,
        lastActivityAt: oldActivityAt,
      },
    ],
    now: motionNow,
  })
  const synthesizing = buildProjectMotionState({
    projectType: "feedback",
    status: "synthesizing",
    updatedAt: oldActivityAt,
    sessions: [],
    now: motionNow,
  })

  assert.equal(live.isInMotion, true)
  assert.equal(live.reason, "session_in_progress")
  assert.equal(synthesizing.isInMotion, true)
  assert.equal(synthesizing.reason, "synthesizing")
})

test("data-derived keeps flagged completed feedback sessions in motion", () => {
  const state = buildProjectMotionState({
    projectType: "feedback",
    status: "draft",
    updatedAt: oldActivityAt,
    sessions: [
      {
        projectId: "proj-a",
        status: "complete",
        qualityFlag: true,
        excludedFromSynthesis: false,
        lastActivityAt: oldActivityAt,
      },
    ],
    now: motionNow,
  })

  assert.equal(state.isInMotion, true)
  assert.equal(state.reason, "flagged_completed_session")
})

test("data-derived returns unflagged old completed feedback sessions to quiet", () => {
  const state = buildProjectMotionState({
    projectType: "feedback",
    status: "draft",
    updatedAt: oldActivityAt,
    sessions: [
      {
        projectId: "proj-a",
        status: "complete",
        qualityFlag: false,
        excludedFromSynthesis: false,
        lastActivityAt: oldActivityAt,
      },
    ],
    now: motionNow,
  })

  assert.equal(state.isInMotion, false)
  assert.equal(state.reason, "quiet")
})
