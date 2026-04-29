import assert from "node:assert/strict"
import test from "node:test"

import {
  archiveProject,
  appendSessionEvents,
  completeParticipantSession,
  createParticipantSession,
  createProjectFromForm,
  getParticipantSession,
  getPublicInterviewConfig,
  getPublicTestimonialConfig,
  getPublicTestimonialEmbed,
  getWorkspaceSnapshot,
  listProjects,
  permanentlyDeleteArchivedProject,
  permanentlyDeleteArchivedProjects,
  restoreArchivedProject,
  resumeParticipantSession,
  submitTestimonialReview,
} from "../lib/data/mock"

function resetMockStore() {
  ;(
    globalThis as typeof globalThis & {
      __gatheraiMockStore?: unknown
    }
  ).__gatheraiMockStore = undefined
}

test("mock project archive hides active lists and restore returns it", () => {
  resetMockStore()

  const { project } = createProjectFromForm({
    projectType: "feedback",
    name: "Archive lifecycle",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  })

  assert.equal(listProjects().some((item) => item.id === project.id), true)

  const archived = archiveProject(project.id)

  assert.ok(archived?.archivedAt)
  assert.equal(listProjects().some((item) => item.id === project.id), false)
  assert.equal(
    getWorkspaceSnapshot().projects.some((item) => item.id === project.id),
    false
  )
  assert.equal(
    listProjects({ view: "archived" }).some((item) => item.id === project.id),
    true
  )

  restoreArchivedProject(project.id)

  assert.equal(listProjects().some((item) => item.id === project.id), true)
  assert.equal(
    listProjects({ view: "archived" }).some((item) => item.id === project.id),
    false
  )
})

test("mock archived interviews reject public capture and active session writes", () => {
  resetMockStore()

  const { project } = createProjectFromForm({
    projectType: "feedback",
    name: "Archived capture",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  })
  const started = createParticipantSession(project.publicLinkToken)

  assert.ok(started)
  archiveProject(project.id)

  assert.equal(getPublicInterviewConfig(project.publicLinkToken), null)
  assert.equal(createParticipantSession(project.publicLinkToken), null)
  assert.equal(
    resumeParticipantSession(started.session.id, started.recoveryToken),
    null
  )
  assert.equal(
    appendSessionEvents(started.session.id, {
      segments: [{ speaker: "participant", text: "Late answer." }],
    }),
    null
  )
  assert.equal(completeParticipantSession(started.session.id), null)
})

test("mock permanent delete only removes archived project graphs", () => {
  resetMockStore()

  const { project } = createProjectFromForm({
    projectType: "feedback",
    name: "Delete archived",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  })
  const started = createParticipantSession(project.publicLinkToken)

  assert.ok(started)
  assert.equal(permanentlyDeleteArchivedProject(project.id), null)

  archiveProject(project.id)
  const deleted = permanentlyDeleteArchivedProject(project.id)

  assert.deepEqual(deleted, { id: project.id })
  assert.equal(getParticipantSession(started.session.id), null)
  assert.equal(listProjects().some((item) => item.id === project.id), false)
  assert.equal(
    listProjects({ view: "archived" }).some((item) => item.id === project.id),
    false
  )
})

test("mock delete all archived leaves active projects intact", () => {
  resetMockStore()

  const first = createProjectFromForm({
    projectType: "feedback",
    name: "Archive one",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  }).project
  const second = createProjectFromForm({
    projectType: "feedback",
    name: "Archive two",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  }).project
  const active = createProjectFromForm({
    projectType: "feedback",
    name: "Keep active",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 6,
    anonymityMode: "anonymous",
  }).project

  archiveProject(first.id)
  archiveProject(second.id)

  assert.deepEqual(permanentlyDeleteArchivedProjects(), { count: 2 })
  assert.equal(listProjects().some((item) => item.id === active.id), true)
  assert.equal(listProjects({ view: "archived" }).length, 0)
})

test("mock archived testimonial capture stops while embed keeps reviews", () => {
  resetMockStore()

  const { project } = createProjectFromForm({
    projectType: "testimonial",
    name: "Archived testimonials",
    objective: "",
    areasOfInterest: "",
    requiredQuestions: "",
    durationCapMinutes: 5,
    anonymityMode: "named",
  })
  const initialEmbed = getPublicTestimonialEmbed(project.id)

  assert.ok(initialEmbed)
  assert.equal(initialEmbed.captureEnabled, true)

  const review = submitTestimonialReview(initialEmbed.link.linkToken, {
    transcript: "Helpful, clear, and easy to recommend.",
    reviewerName: "Avery",
    rating: 5,
  })

  assert.ok(review)
  review.status = "approved"

  archiveProject(project.id)

  assert.equal(getPublicTestimonialConfig(initialEmbed.link.linkToken), null)
  const archivedEmbed = getPublicTestimonialEmbed(project.id)

  assert.ok(archivedEmbed)
  assert.equal(archivedEmbed.captureEnabled, false)
  assert.equal(archivedEmbed.reviews.length, 1)
  assert.equal(archivedEmbed.reviews[0]?.transcript, review.transcript)
})
