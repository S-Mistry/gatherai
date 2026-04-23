import assert from "node:assert/strict"
import test from "node:test"

import {
  getCreateProjectTypeOptions,
  getProjectTypeBadge,
  getProjectTypePreset,
  normalizeProjectType,
  resolveCreateProjectType,
} from "../lib/project-types"

test("project type helpers return discovery metadata", () => {
  const preset = getProjectTypePreset("discovery")
  const badge = getProjectTypeBadge("discovery")

  assert.equal(normalizeProjectType("discovery"), "discovery")
  assert.equal(preset.label, "Discovery")
  assert.equal(badge.label, "Discovery")
  assert.equal(badge.variant, "accent")
})

test("project type helpers return feedback metadata", () => {
  const preset = getProjectTypePreset("feedback")
  const badge = getProjectTypeBadge("feedback")

  assert.equal(normalizeProjectType("feedback"), "feedback")
  assert.equal(preset.label, "Feedback")
  assert.equal(badge.label, "Feedback")
  assert.equal(badge.variant, "success")
})

test("project type helpers default untrusted values to discovery", () => {
  for (const value of [undefined, null, "", "retrospective"]) {
    const preset = getProjectTypePreset(value)
    const badge = getProjectTypeBadge(value)

    assert.equal(normalizeProjectType(value), "discovery")
    assert.equal(preset.label, "Discovery")
    assert.equal(badge.label, "Discovery")
    assert.equal(badge.variant, "accent")
  }
})

test("create-time project type resolution defaults to feedback", () => {
  assert.equal(resolveCreateProjectType(undefined, false), "feedback")
  assert.equal(resolveCreateProjectType("feedback", false), "feedback")
  assert.equal(resolveCreateProjectType("discovery", true), "discovery")
  assert.equal(resolveCreateProjectType("discovery", false), "feedback")
})

test("create-time project type options hide discovery when disabled", () => {
  assert.deepEqual(getCreateProjectTypeOptions(false), ["feedback"])
  assert.deepEqual(getCreateProjectTypeOptions(true), ["discovery", "feedback"])
})
