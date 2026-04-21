import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

import { buildDeterministicQualitySnapshot } from "@/lib/analysis/quality"
import {
  attachGeneratedOutputMetadata,
  buildAnalysisEvalProjectBundles,
  type EvalProjectBundle,
} from "@/lib/analysis/eval-harness"
import { roundScore } from "@/lib/analysis/transcript"
import type { QualityDimension, SessionOutputGenerated } from "@/lib/domain/types"
import {
  materializeProjectSynthesisAnalysis,
  materializeSessionOutputAnalysis,
} from "@/lib/openai/analysis"

function loadLocalEnv() {
  const candidateFiles = [".env.local", ".env"]

  for (const candidate of candidateFiles) {
    const fullPath = path.resolve(process.cwd(), candidate)

    if (!existsSync(fullPath)) {
      continue
    }

    const contents = readFileSync(fullPath, "utf8")

    for (const line of contents.split("\n")) {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith("#")) {
        continue
      }

      const equalsIndex = trimmed.indexOf("=")

      if (equalsIndex === -1) {
        continue
      }

      const key = trimmed.slice(0, equalsIndex).trim()
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "")

      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  }
}

function remapEvidence(
  evidence: Array<{ sessionId: string; segmentIds: string[]; rationale: string }>,
  sessionIdMap: ReadonlyMap<string, string>,
  segmentIdMap: ReadonlyMap<string, string>
) {
  return evidence.map((ref) => ({
    sessionId: sessionIdMap.get(ref.sessionId) ?? ref.sessionId,
    segmentIds: ref.segmentIds.map((segmentId) => segmentIdMap.get(segmentId) ?? segmentId),
    rationale: ref.rationale,
  }))
}

function remapSessionOutput(
  output: SessionOutputGenerated,
  sessionIdMap: ReadonlyMap<string, string>,
  segmentIdMap: ReadonlyMap<string, string>
) {
  return {
    summary: output.summary,
    questionAnswers: output.questionAnswers.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    questionReviews: output.questionReviews.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    themes: output.themes.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    painPoints: output.painPoints.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    opportunities: output.opportunities.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    risks: output.risks.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    keyQuotes: output.keyQuotes.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    quoteLibrary: output.quoteLibrary.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    insightCards: output.insightCards.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    tensions: output.tensions.map((item) => ({
      ...item,
      evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
    })),
    unresolvedQuestions: output.unresolvedQuestions,
    projectImplications: output.projectImplications,
    recommendedActions: output.recommendedActions,
    analysisWarnings: output.analysisWarnings,
    confidenceScore: output.confidenceScore,
    respondentProfile: output.respondentProfile,
  }
}

function buildQualityDimensions(output: SessionOutputGenerated, snapshot: ReturnType<typeof buildDeterministicQualitySnapshot>) {
  const dimensions: QualityDimension[] = [
    {
      key: "question_coverage",
      score: snapshot.coverage,
      rationale:
        snapshot.coverage >= 0.8
          ? "Most required questions have evidence-backed answers."
          : "Several required questions still need stronger evidence.",
    },
    {
      key: "answer_specificity",
      score: snapshot.specificity,
      rationale:
        snapshot.meaningfulCharacterCount >= 450
          ? "The transcript includes concrete operational detail."
          : "The transcript remains light on concrete operational detail.",
    },
    {
      key: "repetition",
      score: snapshot.repetition,
      rationale:
        snapshot.repetition >= 0.7
          ? "The respondent covered multiple distinct points."
          : "The respondent repeated similar ideas, limiting depth.",
    },
    {
      key: "faithfulness",
      score: snapshot.evidenceCompleteness,
      rationale: "This local seed uses deterministic evidence completeness as the faithfulness proxy.",
    },
    {
      key: "decision_usefulness",
      score: roundScore(
        snapshot.coverage * 0.5 + snapshot.transcriptSufficiency * 0.5
      ),
      rationale: "Usefulness blends question coverage with transcript sufficiency in the local seed flow.",
    },
  ]

  const overall = roundScore(
    dimensions.reduce((total, dimension) => total + dimension.score, 0) /
      dimensions.length
  )

  return {
    overall,
    lowQuality: overall < 0.55 || snapshot.transcriptSufficiency < 0.22,
    dimensions,
  }
}

// The local fixture seeder writes across many Supabase tables that are not codegen-typed here.
// Keeping the looseness scoped to this script avoids polluting production paths.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureQaUser(client: any) {
  const qaEmail =
    process.env.GATHERAI_FIXTURE_EMAIL ?? "analysis-fixtures@gatherai.local"
  const qaPassword =
    process.env.GATHERAI_FIXTURE_PASSWORD ?? "gatherai-local-dev"

  const usersResponse = await client.auth.admin.listUsers()

  if (usersResponse.error) {
    throw new Error(`Unable to list Supabase users: ${usersResponse.error.message}`)
  }

  let qaUser =
    usersResponse.data.users.find((user: { email?: string | null }) => user.email === qaEmail) ??
    null

  if (!qaUser) {
    const created = await client.auth.admin.createUser({
      email: qaEmail,
      password: qaPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Analysis Fixtures",
        workspace_name: "Analysis Fixture Workspace",
      },
    })

    if (created.error || !created.data.user) {
      throw new Error(
        `Unable to create fixture QA user: ${created.error?.message ?? "Unknown error"}`
      )
    }

    qaUser = created.data.user
  }

  const workspaceMemberResult = await client
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", qaUser.id)
    .limit(1)
    .maybeSingle()

  if (workspaceMemberResult.error) {
    throw new Error(
      `Unable to load workspace membership for fixture user: ${workspaceMemberResult.error.message}`
    )
  }

  let workspaceId =
    (workspaceMemberResult.data as { workspace_id?: string } | null)?.workspace_id ?? null

  if (!workspaceId) {
    const workspaceIdCreated = crypto.randomUUID()
    const workspaceInsert = await client.from("workspaces").insert({
      id: workspaceIdCreated,
      name: "Analysis Fixture Workspace",
      owner_user_id: qaUser.id,
    })

    if (workspaceInsert.error) {
      throw new Error(`Unable to create fixture workspace: ${workspaceInsert.error.message}`)
    }

    const membershipInsert = await client.from("workspace_members").insert({
      workspace_id: workspaceIdCreated,
      user_id: qaUser.id,
      role: "owner",
    })

    if (membershipInsert.error) {
      throw new Error(
        `Unable to create fixture workspace membership: ${membershipInsert.error.message}`
      )
    }

    workspaceId = workspaceIdCreated
  }

  return {
    qaEmail,
    qaPassword,
    qaUserId: qaUser.id,
    workspaceId,
  }
}

async function clearExistingFixtureProjects(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  workspaceId: string,
  bundles: EvalProjectBundle[]
) {
  const slugs = bundles.map((bundle) => bundle.project.slug)

  const deletion = await client
    .from("projects")
    .delete()
    .eq("workspace_id", workspaceId)
    .in("slug", slugs)

  if (deletion.error) {
    throw new Error(`Unable to clear existing fixture projects: ${deletion.error.message}`)
  }
}

async function main() {
  loadLocalEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !supabaseSecret) {
    throw new Error(
      "Local Supabase env is not configured. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = createClient(supabaseUrl, supabaseSecret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const bundles = await buildAnalysisEvalProjectBundles()
  const identity = await ensureQaUser(client)

  await clearExistingFixtureProjects(client, identity.workspaceId, bundles)

  for (const bundle of bundles) {
    const projectId = crypto.randomUUID()
    const configId = crypto.randomUUID()
    const linkId = crypto.randomUUID()
    const sessionIdMap = new Map<string, string>()
    const segmentIdMap = new Map<string, string>()

    const projectInsert = await client.from("projects").insert({
      id: projectId,
      workspace_id: identity.workspaceId,
      project_type: bundle.project.projectType,
      name: bundle.project.name,
      slug: bundle.project.slug,
      client_name: bundle.project.clientName,
      status: "ready",
      created_at: bundle.project.createdAt,
      updated_at: bundle.project.updatedAt,
    })

    if (projectInsert.error) {
      throw new Error(`Unable to insert project ${bundle.project.slug}: ${projectInsert.error.message}`)
    }

    const configInsert = await client.from("project_config_versions").insert({
      id: configId,
      project_id: projectId,
      version_number: bundle.config.versionNumber,
      objective: bundle.config.objective,
      areas_of_interest: bundle.config.areasOfInterest,
      required_questions: bundle.config.requiredQuestions,
      background_context: bundle.config.backgroundContext ?? null,
      duration_cap_minutes: bundle.config.durationCapMinutes,
      interview_mode: bundle.config.interviewMode,
      anonymity_mode: bundle.config.anonymityMode,
      tone_style: bundle.config.toneStyle,
      metadata_prompts: bundle.config.metadataPrompts,
      prohibited_topics: bundle.config.prohibitedTopics,
      follow_up_limit: bundle.config.followUpLimit,
      created_at: bundle.config.createdAt,
    })

    if (configInsert.error) {
      throw new Error(`Unable to insert config for ${bundle.project.slug}: ${configInsert.error.message}`)
    }

    const linkInsert = await client.from("project_public_links").insert({
      id: linkId,
      project_id: projectId,
      project_config_version_id: configId,
      link_token: `${bundle.project.slug}-fixture-link`,
      created_at: bundle.project.createdAt,
    })

    if (linkInsert.error) {
      throw new Error(`Unable to insert public link for ${bundle.project.slug}: ${linkInsert.error.message}`)
    }

    const sessionOutputs: SessionOutputGenerated[] = []

    for (const sessionBundle of bundle.sessions) {
      const sessionId = crypto.randomUUID()
      sessionIdMap.set(sessionBundle.session.id, sessionId)

      for (const segment of sessionBundle.transcript) {
        segmentIdMap.set(segment.id, crypto.randomUUID())
      }

      const sessionInsert = await client.from("participant_sessions").insert({
        id: sessionId,
        project_id: projectId,
        project_config_version_id: configId,
        public_link_id: linkId,
        respondent_label: sessionBundle.session.respondentLabel,
        status: sessionBundle.session.status,
        metadata: sessionBundle.session.metadata,
        quality_flag: false,
        excluded_from_synthesis: sessionBundle.session.excludedFromSynthesis,
        runtime_state: sessionBundle.session.runtimeState,
        started_at: sessionBundle.session.startedAt,
        last_activity_at: sessionBundle.session.lastActivityAt,
        completed_at: sessionBundle.session.completedAt,
        resume_expires_at: sessionBundle.session.resumeExpiresAt,
      })

      if (sessionInsert.error) {
        throw new Error(
          `Unable to insert session ${sessionBundle.session.id}: ${sessionInsert.error.message}`
        )
      }

      const transcriptInsert = await client.from("transcript_segments").insert(
        sessionBundle.transcript.map((segment) => ({
          id: segmentIdMap.get(segment.id),
          session_id: sessionId,
          speaker: segment.speaker,
          content: segment.text,
          order_index: segment.orderIndex,
          created_at: segment.createdAt,
        }))
      )

      if (transcriptInsert.error) {
        throw new Error(
          `Unable to insert transcript for session ${sessionBundle.session.id}: ${transcriptInsert.error.message}`
        )
      }

      const output = attachGeneratedOutputMetadata(
        sessionBundle.session,
        materializeSessionOutputAnalysis({
          session: sessionBundle.session,
          config: bundle.config,
          transcript: sessionBundle.transcript,
          grounded: sessionBundle.fixture.grounded as never,
          narrative: sessionBundle.fixture.narrative,
        })
      )
      const remappedOutput = remapSessionOutput(output, sessionIdMap, segmentIdMap)
      sessionOutputs.push({
        ...output,
        sessionId,
      })

      const outputInsert = await client.from("session_outputs_generated").insert({
        session_id: sessionId,
        cleaned_transcript: output.cleanedTranscript,
        payload: remappedOutput,
        prompt_version_id: null,
        model_version_id: null,
        created_at: new Date().toISOString(),
      })

      if (outputInsert.error) {
        throw new Error(
          `Unable to insert generated output for session ${sessionBundle.session.id}: ${outputInsert.error.message}`
        )
      }

      const snapshot = buildDeterministicQualitySnapshot(
        bundle.config,
        sessionBundle.transcript,
        output
      )
      const quality = buildQualityDimensions(output, snapshot)

      const qualityInsert = await client.from("quality_scores").insert({
        session_id: sessionId,
        overall: quality.overall,
        low_quality: quality.lowQuality,
        scorer_source: "application",
        dimensions: quality.dimensions,
      })

      if (qualityInsert.error) {
        throw new Error(
          `Unable to insert quality score for session ${sessionBundle.session.id}: ${qualityInsert.error.message}`
        )
      }

      const qualityFlagUpdate = await client
        .from("participant_sessions")
        .update({ quality_flag: quality.lowQuality })
        .eq("id", sessionId)

      if (qualityFlagUpdate.error) {
        throw new Error(
          `Unable to update quality flag for session ${sessionBundle.session.id}: ${qualityFlagUpdate.error.message}`
        )
      }
    }

    if (bundle.fixture.rawSynthesis) {
      const synthesis = materializeProjectSynthesisAnalysis({
        sessions: bundle.sessions.map((sessionBundle) => ({
          ...sessionBundle.session,
          id: sessionIdMap.get(sessionBundle.session.id) ?? sessionBundle.session.id,
          projectId,
          projectConfigVersionId: configId,
          publicLinkToken: `${bundle.project.slug}-fixture-link`,
        })),
        outputs: sessionOutputs.map((output) => ({
          ...output,
          questionAnswers: output.questionAnswers.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          questionReviews: output.questionReviews.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          themes: output.themes.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          painPoints: output.painPoints.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          opportunities: output.opportunities.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          risks: output.risks.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          keyQuotes: output.keyQuotes.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          quoteLibrary: output.quoteLibrary.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          insightCards: output.insightCards.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          tensions: output.tensions.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
        })),
        raw: bundle.fixture.rawSynthesis,
      })

      const synthesisInsert = await client.from("project_syntheses_generated").insert({
        project_id: projectId,
        included_session_ids: synthesis.includedSessionIds.map(
          (sessionId) => sessionIdMap.get(sessionId) ?? sessionId
        ),
        payload: {
          executiveSummary: synthesis.executiveSummary,
          crossInterviewThemes: synthesis.crossInterviewThemes.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          contradictionMap: synthesis.contradictionMap.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          alignmentSignals: synthesis.alignmentSignals,
          misalignmentSignals: synthesis.misalignmentSignals,
          topProblems: synthesis.topProblems,
          recommendedFocusAreas: synthesis.recommendedFocusAreas,
          notableQuotesByTheme: synthesis.notableQuotesByTheme.map((item) => ({
            ...item,
            evidence: remapEvidence(item.evidence, sessionIdMap, segmentIdMap),
          })),
          warning: synthesis.warning,
        },
        prompt_version_id: null,
        model_version_id: null,
      })

      if (synthesisInsert.error) {
        throw new Error(
          `Unable to insert project synthesis for ${bundle.project.slug}: ${synthesisInsert.error.message}`
        )
      }
    }
  }

  console.log(
    `Seeded ${bundles.length} analysis fixture project(s) into workspace ${identity.workspaceId}.`
  )
  console.log(`QA consultant email: ${identity.qaEmail}`)
  console.log(`QA consultant password: ${identity.qaPassword}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
