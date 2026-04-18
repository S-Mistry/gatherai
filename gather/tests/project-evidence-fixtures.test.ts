import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

import { resolveProjectClaimEvidence } from "../lib/project-evidence"

async function loadFixture<T>(name: string): Promise<T> {
  const url = new URL(`./fixtures/${name}`, import.meta.url)
  const contents = await readFile(url, "utf8")
  return JSON.parse(contents) as T
}

interface ProjectEvidenceFixture {
  projectId: string
  projectWorkspaceId: string
  viewerWorkspaceId: string
  synthesis: Record<string, unknown>
  sessions: Array<Record<string, unknown>>
  transcript: Array<Record<string, unknown>>
}

test("project evidence fixtures resolve cross-session theme excerpts", async () => {
  const fixture = await loadFixture<ProjectEvidenceFixture>("project-evidence.json")

  const payload = resolveProjectClaimEvidence({
    projectId: fixture.projectId,
    projectWorkspaceId: fixture.projectWorkspaceId,
    viewerWorkspaceId: fixture.viewerWorkspaceId,
    kind: "theme",
    claimId: "theme-1",
    synthesis: fixture.synthesis as never,
    sessions: fixture.sessions as never,
    transcript: fixture.transcript as never,
  })

  assert.ok(payload)
  assert.equal(payload?.title, "Decision bottlenecks")
  assert.equal(payload?.excerpts.length, 2)
  assert.deepEqual(
    payload?.excerpts.map((excerpt) => excerpt.respondentLabel),
    ["Amelia", "Liam"]
  )
  assert.equal(
    payload?.excerpts[0]?.segments[0]?.text,
    "We do not need another framework; we need a way to stop waiting on three approvals."
  )
})

test("project evidence fixtures resolve contradictions and notable quotes through one path", async () => {
  const fixture = await loadFixture<ProjectEvidenceFixture>("project-evidence.json")

  const contradictionPayload = resolveProjectClaimEvidence({
    projectId: fixture.projectId,
    projectWorkspaceId: fixture.projectWorkspaceId,
    viewerWorkspaceId: fixture.viewerWorkspaceId,
    kind: "contradiction",
    claimId: "contra-1",
    synthesis: fixture.synthesis as never,
    sessions: fixture.sessions as never,
    transcript: fixture.transcript as never,
  })
  const quotePayload = resolveProjectClaimEvidence({
    projectId: fixture.projectId,
    projectWorkspaceId: fixture.projectWorkspaceId,
    viewerWorkspaceId: fixture.viewerWorkspaceId,
    kind: "notable_quote",
    claimId: "quote-1",
    synthesis: fixture.synthesis as never,
    sessions: fixture.sessions as never,
    transcript: fixture.transcript as never,
  })

  assert.ok(contradictionPayload)
  assert.equal(contradictionPayload?.contextLabel, "Positions")
  assert.equal(contradictionPayload?.excerpts.length, 1)
  assert.ok(quotePayload)
  assert.equal(quotePayload?.title, "Approval frustration")
  assert.equal(quotePayload?.excerpts[0]?.reviewHref, "/app/projects/proj-1/sessions/sess-a")
})

test("project evidence fixtures preserve transcript order for multi-segment refs", async () => {
  const fixture = await loadFixture<ProjectEvidenceFixture>("project-evidence.json")

  const payload = resolveProjectClaimEvidence({
    projectId: fixture.projectId,
    projectWorkspaceId: fixture.projectWorkspaceId,
    viewerWorkspaceId: fixture.viewerWorkspaceId,
    kind: "contradiction",
    claimId: "contra-1",
    synthesis: fixture.synthesis as never,
    sessions: fixture.sessions as never,
    transcript: fixture.transcript as never,
  })

  assert.ok(payload)
  assert.deepEqual(
    payload?.excerpts[0]?.segments.map((segment) => segment.id),
    ["seg-a-3", "seg-a-4"]
  )
})

test("project evidence fixtures drop missing transcript rows without fabricating quotes", async () => {
  const fixture = await loadFixture<ProjectEvidenceFixture>("project-evidence.json")

  const payload = resolveProjectClaimEvidence({
    projectId: fixture.projectId,
    projectWorkspaceId: fixture.projectWorkspaceId,
    viewerWorkspaceId: fixture.viewerWorkspaceId,
    kind: "notable_quote",
    claimId: "quote-missing",
    synthesis: fixture.synthesis as never,
    sessions: fixture.sessions as never,
    transcript: fixture.transcript as never,
  })

  assert.ok(payload)
  assert.equal(payload?.displayedEvidenceCount, 1)
  assert.equal(payload?.excerpts.length, 0)
})

test("project evidence fixtures reject access outside the project workspace", async () => {
  const fixture = await loadFixture<ProjectEvidenceFixture>("project-evidence.json")

  assert.throws(
    () =>
      resolveProjectClaimEvidence({
        projectId: fixture.projectId,
        projectWorkspaceId: fixture.projectWorkspaceId,
        viewerWorkspaceId: "ws-other",
        kind: "theme",
        claimId: "theme-1",
        synthesis: fixture.synthesis as never,
        sessions: fixture.sessions as never,
        transcript: fixture.transcript as never,
      }),
    /Project evidence access denied\./
  )
})
