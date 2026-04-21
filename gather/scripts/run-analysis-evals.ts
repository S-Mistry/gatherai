import { runAnalysisEvalCorpus } from "@/lib/analysis/eval-harness"

async function main() {
  const result = await runAnalysisEvalCorpus()

  if (result.failures.length > 0) {
    console.error(
      `Analysis eval corpus failed ${result.failures.length} check(s) across ${result.bundles.length} project bundle(s).`
    )

    for (const failure of result.failures) {
      console.error(`[${failure.scope}] ${failure.caseId}: ${failure.message}`)
    }

    process.exitCode = 1
    return
  }

  console.log(
    `Analysis eval corpus passed ${result.checks} grouped check(s) across ${result.bundles.length} project bundle(s).`
  )
}

void main()
