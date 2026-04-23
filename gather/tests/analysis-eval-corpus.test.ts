import assert from "node:assert/strict"
import test from "node:test"

import {
  loadAnalysisEvalCorpus,
  runAnalysisEvalCorpus,
} from "../lib/analysis/eval-harness"

test("analysis eval corpus passes deterministic transcript and synthesis guardrails", async () => {
  const corpus = await loadAnalysisEvalCorpus()
  const result = await runAnalysisEvalCorpus()

  assert.equal(result.bundles.length, corpus.projects.length)
  assert.equal(
    result.failures.length,
    0,
    result.failures.map((failure) => failure.message).join("\n")
  )
  assert.ok(result.checks >= 6)
})
