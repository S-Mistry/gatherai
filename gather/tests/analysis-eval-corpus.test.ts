import assert from "node:assert/strict"
import test from "node:test"

import { runAnalysisEvalCorpus } from "../lib/analysis/eval-harness"

test("analysis eval corpus passes deterministic transcript and synthesis guardrails", async () => {
  const result = await runAnalysisEvalCorpus()

  assert.equal(result.bundles.length, 8)
  assert.equal(result.failures.length, 0, result.failures.map((failure) => failure.message).join("\n"))
  assert.ok(result.checks >= 6)
})
