import { readFile } from "node:fs/promises"

import { buildInitialRuntimeState } from "@/lib/domain/state-machine"
import type {
  ParticipantSession,
  ProjectConfigVersion,
  ProjectRecord,
  ProjectType,
  QuestionDefinition,
  SessionOutputGenerated,
  TranscriptSegment,
  TranscriptSpeaker,
} from "@/lib/domain/types"
import {
  materializeProjectSynthesisAnalysis,
  materializeSessionOutputAnalysis,
  type RawProjectSynthesis,
  type RawSessionNarrative,
} from "@/lib/openai/analysis"
import { getProjectTypePreset } from "@/lib/project-types"

import { buildAnalysisTranscriptBlocks } from "./transcript"

interface EvalTranscriptSegmentFixture {
  id: string
  speaker: TranscriptSpeaker
  text: string
}

interface SessionEvalExpectations {
  lowSignalSegmentIds?: string[]
  questionStatuses?: Record<string, "answered" | "partial" | "missing">
  answered?: number
  partial?: number
  missing?: number
  themeTitles?: string[]
  absentThemeTitles?: string[]
  tensionTitles?: string[]
  warningIncludes?: string[]
  confidenceMax?: number
  confidenceMin?: number
  minQuoteCount?: number
}

interface ProjectEvalExpectations {
  includedSessionIds?: string[]
  themeTitles?: string[]
  absentThemeTitles?: string[]
  themeFrequencies?: Record<string, number>
  contradictionTopics?: string[]
  warningIncludes?: string[]
  quoteSummaryIncludes?: string[]
}

interface SessionEvalFixture {
  id: string
  respondentLabel: string
  metadata?: Record<string, string>
  excludedFromSynthesis?: boolean
  transcript: EvalTranscriptSegmentFixture[]
  grounded: Record<string, unknown>
  narrative: RawSessionNarrative
  expectations: SessionEvalExpectations
}

interface ProjectEvalFixture {
  id: string
  projectType?: ProjectType
  name: string
  clientName: string
  objective: string
  areasOfInterest: string[]
  requiredQuestions: QuestionDefinition[]
  backgroundContext?: string
  sessions: SessionEvalFixture[]
  rawSynthesis?: RawProjectSynthesis
  synthesisExpectations?: ProjectEvalExpectations
}

interface AnalysisEvalCorpus {
  projects: ProjectEvalFixture[]
}

export interface EvalProjectBundle {
  fixture: ProjectEvalFixture
  project: ProjectRecord
  config: ProjectConfigVersion
  sessions: Array<{
    fixture: SessionEvalFixture
    session: ParticipantSession
    transcript: TranscriptSegment[]
  }>
}

export interface AnalysisEvalFailure {
  scope: "session" | "project"
  caseId: string
  message: string
}

const corpusUrl = new URL("../../tests/fixtures/analysis-eval-corpus.json", import.meta.url)

export async function loadAnalysisEvalCorpus(): Promise<AnalysisEvalCorpus> {
  const contents = await readFile(corpusUrl, "utf8")
  return JSON.parse(contents) as AnalysisEvalCorpus
}

function buildEvalProjectConfig(
  fixture: ProjectEvalFixture,
  index: number
): ProjectConfigVersion {
  const preset = getProjectTypePreset(fixture.projectType ?? "discovery")

  return {
    id: `cfg-${fixture.id}`,
    projectId: fixture.id,
    versionNumber: 1,
    createdAt: new Date(Date.UTC(2026, 3, 18, 9, index, 0)).toISOString(),
    objective: fixture.objective,
    areasOfInterest: fixture.areasOfInterest,
    requiredQuestions: fixture.requiredQuestions,
    backgroundContext: fixture.backgroundContext,
    durationCapMinutes: preset.durationCapMinutes,
    interviewMode: "strict",
    anonymityMode: preset.anonymityMode,
    toneStyle: preset.toneStyle,
    metadataPrompts: [],
    prohibitedTopics: [],
    followUpLimit: preset.followUpLimit,
  }
}

function buildEvalProjectRecord(
  fixture: ProjectEvalFixture,
  config: ProjectConfigVersion
): ProjectRecord {
  return {
    id: fixture.id,
    workspaceId: "ws-analysis-evals",
    projectType: fixture.projectType ?? "discovery",
    name: fixture.name,
    slug: fixture.id,
    clientName: fixture.clientName,
    createdAt: config.createdAt,
    updatedAt: config.createdAt,
    status: "ready",
    currentConfigVersionId: config.id,
    publicLinkToken: `link-${fixture.id}`,
  }
}

function buildEvalTranscript(
  fixture: SessionEvalFixture,
  sessionId: string,
  offsetMinutes: number
): TranscriptSegment[] {
  const startedAt = new Date(Date.UTC(2026, 3, 18, 10, offsetMinutes, 0))

  return fixture.transcript.map((segment, index) => ({
    id: segment.id,
    sessionId,
    speaker: segment.speaker,
    text: segment.text,
    createdAt: new Date(startedAt.getTime() + index * 12_000).toISOString(),
    orderIndex: index + 1,
  }))
}

function buildEvalSession(
  fixture: SessionEvalFixture,
  project: ProjectRecord,
  config: ProjectConfigVersion,
  offsetMinutes: number
): ParticipantSession {
  const startedAt = new Date(Date.UTC(2026, 3, 18, 10, offsetMinutes, 0))
  const runtimeState = buildInitialRuntimeState(config, startedAt)

  return {
    id: fixture.id,
    projectId: project.id,
    projectConfigVersionId: config.id,
    publicLinkToken: project.publicLinkToken,
    respondentLabel: fixture.respondentLabel,
    status: "complete",
    startedAt: startedAt.toISOString(),
    lastActivityAt: new Date(startedAt.getTime() + 8 * 60_000).toISOString(),
    completedAt: new Date(startedAt.getTime() + 9 * 60_000).toISOString(),
    resumeExpiresAt: new Date(startedAt.getTime() + 24 * 60 * 60_000).toISOString(),
    metadata: fixture.metadata ?? {},
    qualityFlag: false,
    excludedFromSynthesis: Boolean(fixture.excludedFromSynthesis),
    runtimeState: {
      ...runtimeState,
      state: "complete",
      askedQuestionIds: config.requiredQuestions.map((question) => question.id),
      remainingQuestionIds: [],
      coverageConfidence: 0.8,
      interviewStartedAt: new Date(startedAt.getTime() + 15_000).toISOString(),
    },
  }
}

export async function buildAnalysisEvalProjectBundles() {
  const corpus = await loadAnalysisEvalCorpus()

  return corpus.projects.map((fixture, projectIndex) => {
    const config = buildEvalProjectConfig(fixture, projectIndex)
    const project = buildEvalProjectRecord(fixture, config)

    return {
      fixture,
      project,
      config,
      sessions: fixture.sessions.map((sessionFixture, sessionIndex) => ({
        fixture: sessionFixture,
        session: buildEvalSession(
          sessionFixture,
          project,
          config,
          projectIndex * 20 + sessionIndex * 3
        ),
        transcript: buildEvalTranscript(
          sessionFixture,
          sessionFixture.id,
          projectIndex * 20 + sessionIndex * 3
        ),
      })),
    } satisfies EvalProjectBundle
  })
}

export function attachGeneratedOutputMetadata(
  session: ParticipantSession,
  output: ReturnType<typeof materializeSessionOutputAnalysis>
): SessionOutputGenerated {
  return {
    id: `generated-${session.id}`,
    sessionId: session.id,
    promptVersionId: "fixture-session-output-v1",
    modelVersionId: "fixture-model-gpt-5.4-mini",
    createdAt: session.completedAt ?? session.lastActivityAt,
    ...output,
  }
}

function evaluateSessionExpectations(
  output: SessionOutputGenerated,
  bundle: EvalProjectBundle["sessions"][number],
  failures: AnalysisEvalFailure[]
) {
  const { expectations } = bundle.fixture
  const blocks = buildAnalysisTranscriptBlocks(bundle.transcript)
  const lowSignalIds = new Set(
    blocks.filter((block) => block.lowSignal).flatMap((block) => block.segmentIds)
  )
  const questionCounts = output.questionReviews.reduce(
    (summary, review) => {
      if (review.status === "answered") {
        summary.answered += 1
      } else if (review.status === "partial") {
        summary.partial += 1
      } else {
        summary.missing += 1
      }

      return summary
    },
    { answered: 0, partial: 0, missing: 0 }
  )
  const themeTitles = output.themes.map((theme) => theme.title)
  const tensionTitles = output.tensions.map((tension) => tension.label)

  expectations.lowSignalSegmentIds?.forEach((segmentId) => {
    if (!lowSignalIds.has(segmentId)) {
      failures.push({
        scope: "session",
        caseId: bundle.fixture.id,
        message: `Expected ${segmentId} to be treated as low-signal.`,
      })
    }
  })

  Object.entries(expectations.questionStatuses ?? {}).forEach(([questionId, status]) => {
    const review = output.questionReviews.find((item) => item.questionId === questionId)

    if (!review || review.status !== status) {
      failures.push({
        scope: "session",
        caseId: bundle.fixture.id,
        message: `Expected question ${questionId} to be ${status}.`,
      })
    }
  })

  if (
    typeof expectations.answered === "number" &&
    expectations.answered !== questionCounts.answered
  ) {
    failures.push({
      scope: "session",
      caseId: bundle.fixture.id,
      message: `Expected ${expectations.answered} answered questions, got ${questionCounts.answered}.`,
    })
  }

  if (
    typeof expectations.partial === "number" &&
    expectations.partial !== questionCounts.partial
  ) {
    failures.push({
      scope: "session",
      caseId: bundle.fixture.id,
      message: `Expected ${expectations.partial} partial questions, got ${questionCounts.partial}.`,
    })
  }

  if (
    typeof expectations.missing === "number" &&
    expectations.missing !== questionCounts.missing
  ) {
    failures.push({
      scope: "session",
      caseId: bundle.fixture.id,
      message: `Expected ${expectations.missing} missing questions, got ${questionCounts.missing}.`,
    })
  }

  expectations.themeTitles?.forEach((title) => {
    if (!themeTitles.includes(title)) {
      failures.push({
        scope: "session",
        caseId: bundle.fixture.id,
        message: `Expected theme "${title}" to survive post-processing.`,
      })
    }
  })

  expectations.absentThemeTitles?.forEach((title) => {
    if (themeTitles.includes(title)) {
      failures.push({
        scope: "session",
        caseId: bundle.fixture.id,
        message: `Expected theme "${title}" to be filtered out.`,
      })
    }
  })

  expectations.tensionTitles?.forEach((title) => {
    if (!tensionTitles.includes(title)) {
      failures.push({
        scope: "session",
        caseId: bundle.fixture.id,
        message: `Expected tension "${title}" to survive post-processing.`,
      })
    }
  })

  expectations.warningIncludes?.forEach((snippet) => {
    if (!output.analysisWarnings.some((warning) => warning.includes(snippet))) {
      failures.push({
        scope: "session",
        caseId: bundle.fixture.id,
        message: `Expected a warning including "${snippet}".`,
      })
    }
  })

  if (
    typeof expectations.confidenceMax === "number" &&
    output.confidenceScore > expectations.confidenceMax
  ) {
    failures.push({
      scope: "session",
      caseId: bundle.fixture.id,
      message: `Expected confidence <= ${expectations.confidenceMax}, got ${output.confidenceScore}.`,
    })
  }

  if (
    typeof expectations.confidenceMin === "number" &&
    output.confidenceScore < expectations.confidenceMin
  ) {
    failures.push({
      scope: "session",
      caseId: bundle.fixture.id,
      message: `Expected confidence >= ${expectations.confidenceMin}, got ${output.confidenceScore}.`,
    })
  }

  if (
    typeof expectations.minQuoteCount === "number" &&
    output.quoteLibrary.length < expectations.minQuoteCount
  ) {
    failures.push({
      scope: "session",
      caseId: bundle.fixture.id,
      message: `Expected at least ${expectations.minQuoteCount} quote(s), got ${output.quoteLibrary.length}.`,
    })
  }
}

function evaluateProjectExpectations(
  synthesis: ReturnType<typeof materializeProjectSynthesisAnalysis>,
  bundle: EvalProjectBundle,
  expectations: ProjectEvalExpectations,
  failures: AnalysisEvalFailure[]
) {
  if (
    expectations.includedSessionIds &&
    expectations.includedSessionIds.join("|") !== synthesis.includedSessionIds.join("|")
  ) {
    failures.push({
      scope: "project",
      caseId: bundle.fixture.id,
      message: `Expected included sessions ${expectations.includedSessionIds.join(", ")} but got ${synthesis.includedSessionIds.join(", ")}.`,
    })
  }

  expectations.themeTitles?.forEach((title) => {
    if (!synthesis.crossInterviewThemes.some((theme) => theme.title === title)) {
      failures.push({
        scope: "project",
        caseId: bundle.fixture.id,
        message: `Expected project theme "${title}" to survive post-processing.`,
      })
    }
  })

  expectations.absentThemeTitles?.forEach((title) => {
    if (synthesis.crossInterviewThemes.some((theme) => theme.title === title)) {
      failures.push({
        scope: "project",
        caseId: bundle.fixture.id,
        message: `Expected project theme "${title}" to be filtered out.`,
      })
    }
  })

  Object.entries(expectations.themeFrequencies ?? {}).forEach(([title, frequency]) => {
    const theme = synthesis.crossInterviewThemes.find((item) => item.title === title)

    if (!theme || theme.frequency !== frequency) {
      failures.push({
        scope: "project",
        caseId: bundle.fixture.id,
        message: `Expected project theme "${title}" frequency ${frequency}.`,
      })
    }
  })

  expectations.contradictionTopics?.forEach((topic) => {
    if (!synthesis.contradictionMap.some((item) => item.topic === topic)) {
      failures.push({
        scope: "project",
        caseId: bundle.fixture.id,
        message: `Expected contradiction "${topic}" to survive post-processing.`,
      })
    }
  })

  expectations.warningIncludes?.forEach((snippet) => {
    if (!synthesis.warning?.includes(snippet)) {
      failures.push({
        scope: "project",
        caseId: bundle.fixture.id,
        message: `Expected synthesis warning to include "${snippet}".`,
      })
    }
  })

  expectations.quoteSummaryIncludes?.forEach((snippet) => {
    if (!synthesis.notableQuotesByTheme.some((quote) => quote.summary.includes(snippet))) {
      failures.push({
        scope: "project",
        caseId: bundle.fixture.id,
        message: `Expected a notable quote summary including "${snippet}".`,
      })
    }
  })
}

export async function runAnalysisEvalCorpus() {
  const bundles = await buildAnalysisEvalProjectBundles()
  const failures: AnalysisEvalFailure[] = []
  let checks = 0

  for (const bundle of bundles) {
    const sessionOutputs = bundle.sessions.map((sessionBundle) => {
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

      evaluateSessionExpectations(output, sessionBundle, failures)
      checks += 1
      return output
    })

    if (bundle.fixture.rawSynthesis && bundle.fixture.synthesisExpectations) {
      const synthesis = materializeProjectSynthesisAnalysis({
        sessions: bundle.sessions.map((sessionBundle) => sessionBundle.session),
        outputs: sessionOutputs,
        raw: bundle.fixture.rawSynthesis,
      })

      evaluateProjectExpectations(
        synthesis,
        bundle,
        bundle.fixture.synthesisExpectations,
        failures
      )
      checks += 1
    }
  }

  return {
    bundles,
    checks,
    failures,
  }
}
