import assert from "node:assert/strict"
import test from "node:test"

import {
  formatProjectSynthesisWarning,
  resolveProjectSynthesisWarning,
} from "../lib/project-synthesis-warning"

test("project synthesis warnings strip identifiers and simplify thin-session caveats", () => {
  const warning = formatProjectSynthesisWarning(
    "This synthesis is based mainly on 2 substantive sessions. The third included session (c299ef4f-de6f-4726-8bf1-302d480379b6) ended before usable experience feedback was captured, so project-level conclusions should be treated as directional rather than comprehensive."
  )

  assert.equal(
    warning,
    "Based mainly on two usable sessions, so treat this as directional."
  )
  assert.ok(!warning.includes("c299ef4f"))
})

test("project synthesis warnings keep one-session caveats short", () => {
  assert.equal(
    resolveProjectSynthesisWarning({
      rawWarning: "",
      includedSessionCount: 1,
      themesNeedMoreEvidence: false,
    }),
    "Based on one usable session, so treat this as directional."
  )
})

test("project synthesis warnings collapse weak-theme notes into one sentence", () => {
  assert.equal(
    resolveProjectSynthesisWarning({
      rawWarning:
        "Potential themes were detected in session analysis, but none met the project-level evidence threshold yet.",
      includedSessionCount: 2,
      themesNeedMoreEvidence: true,
    }),
    "Potential themes are emerging, but the evidence is still too thin for firm conclusions."
  )
})
