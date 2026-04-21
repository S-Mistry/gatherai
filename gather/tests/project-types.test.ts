import assert from "node:assert/strict"
import test from "node:test"

import {
  getProjectTypeBadge,
  getProjectTypePreset,
  normalizeProjectType,
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
