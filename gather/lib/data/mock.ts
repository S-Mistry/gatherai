import {
  buildInitialRuntimeState,
  DEFAULT_RESUME_WINDOW_HOURS,
} from "@/lib/domain/state-machine"
import type {
  AnonymityMode,
  AnalysisJob,
  ParticipantSession,
  ProjectConfigVersion,
  ProjectRecord,
  ProjectType,
  ProjectSynthesisGenerated,
  QualityScore,
  SessionOutputGenerated,
  SessionOutputOverride,
  TranscriptSegment,
  WorkspaceSummary,
} from "@/lib/domain/types"
import { buildCompletionJobs } from "@/lib/jobs/analysis"
import {
  buildParticipantDisclosure,
  buildParticipantIntro,
  DEFAULT_CREATE_PROJECT_TYPE,
  getAnonymousRespondentLabel,
  getProjectTypePreset,
  isProjectType,
  sanitizePublicInterviewConfig,
} from "@/lib/project-types"
import {
  signRecoveryToken,
  verifyRecoveryToken,
} from "@/lib/auth/recovery-token"

interface MockStore {
  workspace: WorkspaceSummary
  projects: ProjectRecord[]
  configVersions: Record<string, ProjectConfigVersion>
  sessions: Record<string, ParticipantSession>
  transcripts: Record<string, TranscriptSegment[]>
  generatedOutputs: Record<string, SessionOutputGenerated>
  outputOverrides: Record<string, SessionOutputOverride>
  syntheses: Record<string, ProjectSynthesisGenerated>
  qualityScores: Record<string, QualityScore>
  jobs: AnalysisJob[]
}

const now = new Date("2026-04-14T09:00:00.000Z")

function iso(offsetMinutes: number) {
  return new Date(now.getTime() + offsetMinutes * 60 * 1000).toISOString()
}

function seedConfig(projectId: string): ProjectConfigVersion {
  return {
    id: "cfg-riverstone-v3",
    projectId,
    versionNumber: 3,
    createdAt: iso(-240),
    objective:
      "Understand friction, alignment gaps, and decisions needed for an operating model redesign workshop.",
    areasOfInterest: [
      "decision quality",
      "handoff friction",
      "cross-functional alignment",
      "risk appetite",
    ],
    requiredQuestions: [
      {
        id: "q-outcomes",
        prompt:
          "What outcomes would make this workshop feel worthwhile for you?",
        goal: "Capture success criteria.",
      },
      {
        id: "q-friction",
        prompt:
          "Where does the current operating model create the most friction?",
        goal: "Identify process pain points.",
      },
      {
        id: "q-risk",
        prompt: "What risks or constraints should the workshop account for?",
        goal: "Surface guardrails and concerns.",
      },
      {
        id: "q-alignment",
        prompt:
          "Where do you see alignment or misalignment across teams today?",
        goal: "Expose contradictions and consensus.",
      },
    ],
    backgroundContext:
      "The client is consolidating regional operations into a single operating model and wants a clear workshop agenda.",
    durationCapMinutes: 15,
    interviewMode: "strict",
    anonymityMode: "pseudonymous",
    toneStyle: "Warm, neutral, researcher-like.",
    metadataPrompts: [
      {
        id: "department",
        label: "Department",
        placeholder: "Operations, Product, Finance...",
        required: false,
      },
      {
        id: "region",
        label: "Region",
        placeholder: "EMEA, North America...",
        required: false,
      },
    ],
    prohibitedTopics: ["personnel reviews", "confidential financial forecasts"],
    followUpLimit: 2,
  }
}

function seedGeneratedOutput(sessionId: string): SessionOutputGenerated {
  return {
    id: `out-${sessionId}`,
    sessionId,
    cleanedTranscript:
      "The participant emphasized unclear approvals, duplicated reporting, and weak escalation paths.",
    summary:
      "The respondent emphasized unclear approvals, duplicated reporting, and weak escalation paths.",
    questionAnswers: [
      {
        questionId: "q-outcomes",
        prompt:
          "What outcomes would make this workshop feel worthwhile for you?",
        answer:
          "A clear decision model and explicit ownership for exceptions would make the workshop worthwhile.",
        confidence: 0.88,
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-1", "seg-amelia-2"],
            rationale:
              "Participant named decision rights and exception ownership as desired outcomes.",
          },
        ],
      },
    ],
    questionReviews: [
      {
        questionId: "q-outcomes",
        prompt:
          "What outcomes would make this workshop feel worthwhile for you?",
        status: "answered",
        answer:
          "A clear decision model and explicit ownership for exceptions would make the workshop worthwhile.",
        confidence: 0.88,
        keyPoints: [
          "Clarify decision rights",
          "Name owners for exception handling",
        ],
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-1", "seg-amelia-2"],
            rationale:
              "Participant named decision rights and exception ownership as desired outcomes.",
          },
        ],
        evidenceQuotes: [
          "We need clearer owners when an exception lands between regional and central teams.",
        ],
        followUpQuestions: [],
      },
    ],
    themes: [
      {
        id: "theme-decisions",
        title: "Decision bottlenecks",
        summary:
          "Approvals stall because ownership is diffused across regions.",
        frequency: 1,
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3"],
            rationale:
              "Participant described stalled approvals and unclear ownership.",
          },
        ],
      },
    ],
    quoteLibrary: [
      {
        id: "quote-library-1",
        label: "Approval frustration",
        excerpt:
          "We do not need another framework; we need a way to stop waiting on three approvals.",
        context:
          "The respondent used this line while describing duplicated review loops across central and regional operations.",
        questionIds: ["q-friction"],
        themeHints: ["Decision bottlenecks"],
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3"],
            rationale: "Direct quote from the participant.",
          },
        ],
      },
    ],
    insightCards: [
      {
        id: "insight-theme-1",
        kind: "theme",
        title: "Decision bottlenecks",
        summary:
          "Approvals stall because ownership is diffused across regional and central teams.",
        priority: "high",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3"],
            rationale:
              "Participant described stalled approvals and unclear ownership.",
          },
        ],
        evidenceQuotes: [
          "We do not need another framework; we need a way to stop waiting on three approvals.",
        ],
      },
      {
        id: "insight-pain-1",
        kind: "pain_point",
        title: "Duplicated approvals",
        summary:
          "Regional and central teams repeat the same approval checks, slowing exception handling.",
        priority: "high",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3"],
            rationale: "Participant called out duplicate review loops.",
          },
        ],
        evidenceQuotes: [
          "We do not need another framework; we need a way to stop waiting on three approvals.",
        ],
      },
      {
        id: "insight-opp-1",
        kind: "opportunity",
        title: "Shared escalation model",
        summary:
          "The workshop should define when local teams escalate to central operations.",
        priority: "medium",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-4"],
            rationale: "Participant asked for a shared escalation model.",
          },
        ],
        evidenceQuotes: [
          "If the rule is unclear, everyone escalates it and nothing moves.",
        ],
      },
      {
        id: "insight-risk-1",
        kind: "risk",
        title: "Change fatigue",
        summary:
          "Teams may resist another process redesign without quick wins.",
        priority: "medium",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-5"],
            rationale:
              "Participant flagged skepticism after previous redesign efforts.",
          },
        ],
        evidenceQuotes: [
          "People will tune out if this feels like another redesign with no decisions.",
        ],
      },
      {
        id: "insight-tension-1",
        kind: "tension",
        title: "Control vs speed",
        summary:
          "Stakeholders want tighter governance without adding more approval latency.",
        priority: "medium",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3", "seg-amelia-4"],
            rationale:
              "The participant wants clearer escalation rules but less waiting.",
          },
        ],
        evidenceQuotes: [
          "We need stronger control, but not by adding another approval layer.",
        ],
      },
    ],
    painPoints: [
      {
        id: "pain-approvals",
        label: "Approvals are duplicated",
        summary: "Regional and central teams repeat the same approval checks.",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3"],
            rationale: "Participant called out duplicate review loops.",
          },
        ],
      },
    ],
    opportunities: [
      {
        id: "opp-escalation",
        label: "Clarify escalation paths",
        summary:
          "The workshop should define when local teams escalate to central operations.",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-4"],
            rationale: "Participant asked for a shared escalation model.",
          },
        ],
      },
    ],
    risks: [
      {
        id: "risk-fatigue",
        label: "Change fatigue",
        summary:
          "Teams may resist another process redesign without quick wins.",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-5"],
            rationale:
              "Participant flagged skepticism after previous redesign efforts.",
          },
        ],
      },
    ],
    keyQuotes: [
      {
        id: "quote-1",
        label: "Key quote",
        summary:
          '"We do not need another framework; we need a way to stop waiting on three approvals."',
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3"],
            rationale: "Direct quote from the participant.",
          },
        ],
      },
    ],
    tensions: [
      {
        id: "tension-1",
        label: "Control vs speed",
        summary:
          "Stakeholders want tighter governance without adding more approval latency.",
        evidence: [
          {
            sessionId,
            segmentIds: ["seg-amelia-3", "seg-amelia-4"],
            rationale:
              "The participant wants clearer escalation rules but less waiting.",
          },
        ],
      },
    ],
    unresolvedQuestions: [
      "Which approval decisions can be delegated safely?",
      "How should exception handling differ by region?",
    ],
    projectImplications: [
      "Use the project readout to map where authority changes hands and why approvals restart.",
      "Push for concrete escalation examples rather than abstract governance principles.",
    ],
    recommendedActions: [
      "Bring current exception cases into the workshop for live decision-rights mapping.",
      "End the workshop with one delegated-approval pilot to test.",
    ],
    analysisWarnings: [],
    confidenceScore: 0.84,
    respondentProfile: {
      department: "Operations",
      region: "EMEA",
      role: "Regional operations lead",
    },
    promptVersionId: "prompt-session-v1",
    modelVersionId: "model-gpt-realtime",
    createdAt: iso(-35),
  }
}

function seedStore(): MockStore {
  const workspace: WorkspaceSummary = {
    id: "ws-solo-consultant",
    name: "Sunil Consulting Studio",
    consultantName: "Sunil",
  }

  const project: ProjectRecord = {
    id: "proj-riverstone",
    workspaceId: workspace.id,
    projectType: "discovery",
    name: "Riverstone operating model sprint",
    slug: "riverstone-operating-model-sprint",
    createdAt: iso(-480),
    updatedAt: iso(-30),
    status: "collecting",
    currentConfigVersionId: "cfg-riverstone-v3",
    publicLinkToken: "riverstone-discovery-link",
  }

  const config = seedConfig(project.id)

  const completedSession: ParticipantSession = {
    id: "sess-amelia",
    projectId: project.id,
    projectConfigVersionId: config.id,
    publicLinkToken: project.publicLinkToken,
    respondentLabel: "Stakeholder A",
    status: "complete",
    startedAt: iso(-90),
    lastActivityAt: iso(-70),
    completedAt: iso(-70),
    resumeExpiresAt: iso(60 * DEFAULT_RESUME_WINDOW_HOURS),
    metadata: {
      department: "Operations",
      region: "EMEA",
    },
    qualityFlag: false,
    excludedFromSynthesis: false,
    runtimeState: {
      ...buildInitialRuntimeState(config, new Date(iso(-90))),
      state: "complete",
      askedQuestionIds: config.requiredQuestions.map((question) => question.id),
      remainingQuestionIds: [],
      followUpCount: 2,
      elapsedSeconds: 760,
      questionElapsedSeconds: 0,
      noveltyScore: 0.5,
      repetitionScore: 0.1,
      coverageConfidence: 0.92,
      summaryPending: false,
    },
  }

  const inProgressSession: ParticipantSession = {
    id: "sess-liam",
    projectId: project.id,
    projectConfigVersionId: config.id,
    publicLinkToken: project.publicLinkToken,
    respondentLabel: "Stakeholder B",
    status: "in_progress",
    startedAt: iso(-20),
    lastActivityAt: iso(-4),
    resumeExpiresAt: iso(60 * DEFAULT_RESUME_WINDOW_HOURS),
    metadata: {
      department: "Product",
      region: "North America",
    },
    qualityFlag: false,
    excludedFromSynthesis: false,
    runtimeState: {
      ...buildInitialRuntimeState(config, new Date(iso(-20))),
      state: "question_active",
      askedQuestionIds: ["q-outcomes"],
      remainingQuestionIds: ["q-friction", "q-risk", "q-alignment"],
      activeQuestionId: "q-friction",
      followUpCount: 1,
      elapsedSeconds: 412,
      questionElapsedSeconds: 110,
      noveltyScore: 0.72,
      repetitionScore: 0.18,
      coverageConfidence: 0.43,
    },
  }

  const flaggedSession: ParticipantSession = {
    id: "sess-priya",
    projectId: project.id,
    projectConfigVersionId: config.id,
    publicLinkToken: project.publicLinkToken,
    respondentLabel: "Stakeholder C",
    status: "complete",
    startedAt: iso(-200),
    lastActivityAt: iso(-188),
    completedAt: iso(-188),
    resumeExpiresAt: iso(60 * DEFAULT_RESUME_WINDOW_HOURS),
    metadata: {
      department: "Finance",
      region: "Global",
    },
    qualityFlag: true,
    excludedFromSynthesis: true,
    runtimeState: {
      ...buildInitialRuntimeState(config, new Date(iso(-200))),
      state: "complete",
      askedQuestionIds: ["q-outcomes", "q-friction"],
      remainingQuestionIds: ["q-risk", "q-alignment"],
      activeQuestionId: undefined,
      followUpCount: 2,
      elapsedSeconds: 403,
      questionElapsedSeconds: 0,
      noveltyScore: 0.12,
      repetitionScore: 0.77,
      coverageConfidence: 0.34,
      summaryPending: false,
    },
  }

  const abandonedSession: ParticipantSession = {
    id: "sess-noah",
    projectId: project.id,
    projectConfigVersionId: config.id,
    publicLinkToken: project.publicLinkToken,
    respondentLabel: "Stakeholder D",
    status: "abandoned",
    startedAt: iso(-150),
    lastActivityAt: iso(-145),
    resumeExpiresAt: iso(-5),
    metadata: {
      department: "Operations",
      region: "APAC",
    },
    qualityFlag: false,
    excludedFromSynthesis: false,
    runtimeState: {
      ...buildInitialRuntimeState(config, new Date(iso(-150))),
      state: "abandoned",
      askedQuestionIds: ["q-outcomes"],
      remainingQuestionIds: ["q-friction", "q-risk", "q-alignment"],
      activeQuestionId: "q-friction",
      followUpCount: 0,
      elapsedSeconds: 220,
      questionElapsedSeconds: 75,
      noveltyScore: 0.2,
      repetitionScore: 0.31,
      coverageConfidence: 0.2,
      summaryPending: false,
    },
  }

  const transcripts: Record<string, TranscriptSegment[]> = {
    "sess-amelia": [
      {
        id: "seg-amelia-1",
        sessionId: "sess-amelia",
        speaker: "agent",
        text: "What outcomes would make this workshop feel worthwhile for you?",
        createdAt: iso(-89),
        orderIndex: 1,
      },
      {
        id: "seg-amelia-2",
        sessionId: "sess-amelia",
        speaker: "participant",
        text: "I need clear ownership for exception handling and faster decisions when issues cross regions.",
        createdAt: iso(-88),
        orderIndex: 2,
      },
      {
        id: "seg-amelia-3",
        sessionId: "sess-amelia",
        speaker: "participant",
        text: "We do not need another framework; we need a way to stop waiting on three approvals.",
        createdAt: iso(-85),
        orderIndex: 3,
      },
      {
        id: "seg-amelia-4",
        sessionId: "sess-amelia",
        speaker: "participant",
        text: "A shared escalation path would help when local and central teams disagree.",
        createdAt: iso(-82),
        orderIndex: 4,
      },
      {
        id: "seg-amelia-5",
        sessionId: "sess-amelia",
        speaker: "participant",
        text: "People are tired of redesign efforts that never simplify the actual approvals.",
        createdAt: iso(-80),
        orderIndex: 5,
      },
    ],
    "sess-liam": [
      {
        id: "seg-liam-1",
        sessionId: "sess-liam",
        speaker: "participant",
        text: "I am midway through mapping where product decisions get blocked by regional sign-off.",
        createdAt: iso(-6),
        orderIndex: 1,
      },
    ],
  }

  const generatedOutputs: Record<string, SessionOutputGenerated> = {
    "sess-amelia": seedGeneratedOutput("sess-amelia"),
  }

  const outputOverrides: Record<string, SessionOutputOverride> = {
    "sess-amelia": {
      id: "override-sess-amelia",
      sessionId: "sess-amelia",
      editedSummary:
        "Consultant note: emphasize duplicate approvals and unclear escalation ownership in workshop framing.",
      suppressedClaimIds: [],
      consultantNotes:
        "Use this interview as a reference case when opening the contradiction map.",
      updatedAt: iso(-25),
    },
  }

  const syntheses: Record<string, ProjectSynthesisGenerated> = {
    "proj-riverstone": {
      id: "syn-riverstone",
      projectId: project.id,
      includedSessionIds: ["sess-amelia", "sess-liam"],
      executiveSummary:
        "Across the current interviews, the strongest signal is not lack of frameworks but lack of decisive ownership. Stakeholders want the workshop to resolve who decides, when to escalate, and how to avoid duplicate approvals.",
      crossInterviewThemes: [
        {
          id: "syn-theme-1",
          title: "Decision rights are blurred",
          summary:
            "Stakeholders repeatedly describe approvals that span multiple owners without a final decider.",
          frequency: 2,
          evidence: [
            {
              sessionId: "sess-amelia",
              segmentIds: ["seg-amelia-3"],
              rationale: "Duplicate approvals cited as a major blocker.",
            },
            {
              sessionId: "sess-liam",
              segmentIds: ["seg-liam-1"],
              rationale:
                "In-progress session points to regional sign-off bottlenecks.",
            },
          ],
        },
      ],
      contradictionMap: [
        {
          id: "contra-1",
          topic: "Where decisions should live",
          positions: [
            "Central operations should own final sign-off for exceptions.",
            "Regional teams need more delegated authority for routine exceptions.",
          ],
          evidence: [
            {
              sessionId: "sess-amelia",
              segmentIds: ["seg-amelia-4"],
              rationale: "Participant wants a shared escalation path.",
            },
          ],
        },
      ],
      alignmentSignals: [
        "Stakeholders want faster exception handling with clearer ownership.",
        "Workshop value is tied to decision-rights clarity rather than broad ideation.",
      ],
      misalignmentSignals: [
        "Teams disagree on how much authority should stay regional versus central.",
      ],
      topProblems: [
        "Duplicate approvals across central and regional teams",
        "Unclear escalation paths when operating rules conflict",
        "Change fatigue from prior redesigns without clear decisions",
      ],
      recommendedFocusAreas: [
        "Map the current exception handling flow",
        "Define decision-rights boundaries",
        "Agree escalation rules and examples",
        "Commit to one pilot change with measurable turnaround impact",
      ],
      notableQuotesByTheme: [
        {
          id: "quote-theme-1",
          label: "Decision bottlenecks",
          summary:
            '"We do not need another framework; we need a way to stop waiting on three approvals."',
          evidence: [
            {
              sessionId: "sess-amelia",
              segmentIds: ["seg-amelia-3"],
              rationale:
                "Quote captures the strongest operational frustration.",
            },
          ],
        },
      ],
      warning:
        "Synthesis confidence is still early because only two sessions are included.",
      promptVersionId: "prompt-synthesis-v1",
      modelVersionId: "model-gpt-4.1-mini",
      createdAt: iso(-15),
    },
  }

  const qualityScores: Record<string, QualityScore> = {
    "sess-amelia": {
      id: "score-amelia",
      sessionId: "sess-amelia",
      overall: 0.88,
      lowQuality: false,
      scorerSource: "braintrust",
      updatedAt: iso(-30),
      dimensions: [
        {
          key: "question_coverage",
          score: 0.94,
          rationale: "All required questions were covered with confirmation.",
        },
        {
          key: "answer_specificity",
          score: 0.87,
          rationale:
            "Answers included concrete process examples and direct language.",
        },
        {
          key: "faithfulness",
          score: 0.9,
          rationale: "Structured outputs map cleanly to transcript evidence.",
        },
        {
          key: "repetition",
          score: 0.79,
          rationale: "Low repetition overall.",
        },
        {
          key: "decision_usefulness",
          score: 0.89,
          rationale: "Themes are actionable for agenda design.",
        },
      ],
    },
    "sess-priya": {
      id: "score-priya",
      sessionId: "sess-priya",
      overall: 0.41,
      lowQuality: true,
      scorerSource: "braintrust",
      updatedAt: iso(-180),
      dimensions: [
        {
          key: "question_coverage",
          score: 0.42,
          rationale:
            "Only half the required questions were covered before the session ended.",
        },
        {
          key: "answer_specificity",
          score: 0.3,
          rationale: "Responses remained vague and repetitive.",
        },
        {
          key: "faithfulness",
          score: 0.6,
          rationale:
            "Outputs are faithful but shallow because evidence is sparse.",
        },
        {
          key: "repetition",
          score: 0.18,
          rationale:
            "Participant repeated the same framing with little novelty.",
        },
        {
          key: "decision_usefulness",
          score: 0.35,
          rationale: "Interview provides limited input for workshop design.",
        },
      ],
    },
  }

  return {
    workspace,
    projects: [project],
    configVersions: {
      [config.id]: config,
    },
    sessions: {
      [completedSession.id]: completedSession,
      [inProgressSession.id]: inProgressSession,
      [flaggedSession.id]: flaggedSession,
      [abandonedSession.id]: abandonedSession,
    },
    transcripts,
    generatedOutputs,
    outputOverrides,
    syntheses,
    qualityScores,
    jobs: buildCompletionJobs("sess-amelia", project.id),
  }
}

declare global {
  var __gatheraiMockStore: MockStore | undefined
}

function getStore() {
  if (!globalThis.__gatheraiMockStore) {
    globalThis.__gatheraiMockStore = seedStore()
  }

  return globalThis.__gatheraiMockStore
}

export function getWorkspaceSnapshot() {
  const store = getStore()
  const sessions = Object.values(store.sessions)
  const projects = store.projects.map((project) => {
    const projectSessions = sessions.filter(
      (session) => session.projectId === project.id
    )
    const completedSessions = projectSessions.filter(
      (session) =>
        session.status === "complete" && !session.excludedFromSynthesis
    )

    return {
      ...project,
      sessionCounts: {
        inProgress: projectSessions.filter(
          (session) => session.status === "in_progress"
        ).length,
        completed: projectSessions.filter(
          (session) => session.status === "complete"
        ).length,
        abandoned: projectSessions.filter(
          (session) => session.status === "abandoned"
        ).length,
        flagged: projectSessions.filter((session) => session.qualityFlag)
          .length,
      },
      activeThemes: store.syntheses[project.id]?.crossInterviewThemes ?? [],
      includedSessions: completedSessions.length,
    }
  })

  return {
    workspace: store.workspace,
    projects,
  }
}

export function listProjects() {
  return getWorkspaceSnapshot().projects
}

export function getProjectDetail(projectId: string) {
  const store = getStore()
  const project = store.projects.find((record) => record.id === projectId)

  if (!project) {
    return null
  }

  const configVersion = store.configVersions[project.currentConfigVersionId]
  const sessions = Object.values(store.sessions).filter(
    (session) => session.projectId === project.id
  )

  return {
    project,
    configVersion,
    sessions,
    synthesis: store.syntheses[project.id],
    qualityScores: store.qualityScores,
  }
}

export function getSessionReview(projectId: string, sessionId: string) {
  const detail = getProjectDetail(projectId)

  if (!detail) {
    return null
  }

  const session = detail.sessions.find((item) => item.id === sessionId)

  if (!session) {
    return null
  }

  const store = getStore()
  const generatedOutput = store.generatedOutputs[sessionId]
  const override = store.outputOverrides[sessionId]
  const effectiveOutput =
    generatedOutput && override?.editedSummary
      ? {
          ...generatedOutput,
          summary: override.editedSummary,
        }
      : generatedOutput

  return {
    project: detail.project,
    configVersion: detail.configVersion,
    session,
    transcript: store.transcripts[sessionId] ?? [],
    transcriptStatus:
      (store.transcripts[sessionId] ?? []).length > 0 ? "ready" : "empty",
    generatedStatus: generatedOutput ? "ready" : "pending",
    qualityStatus: store.qualityScores[sessionId] ? "ready" : "pending",
    analysisFailure: undefined,
    analysisJobs: store.jobs.filter((job) => job.sessionId === sessionId),
    generatedOutput,
    effectiveOutput: effectiveOutput ?? generatedOutput,
    override,
    qualityScore: store.qualityScores[sessionId],
  }
}

export function getPublicInterviewConfig(linkToken: string) {
  const store = getStore()
  const project = store.projects.find(
    (record) => record.publicLinkToken === linkToken
  )

  if (!project) {
    return null
  }

  const config = store.configVersions[project.currentConfigVersionId]

  return sanitizePublicInterviewConfig({
    projectId: project.id,
    projectType: project.projectType,
    projectName: project.name,
    objective: config.objective,
    durationCapMinutes: config.durationCapMinutes,
    anonymityMode: config.anonymityMode,
    toneStyle: config.toneStyle,
    followUpLimit: config.followUpLimit,
    intro: buildParticipantIntro(project.projectType),
    disclosure: buildParticipantDisclosure(project.projectType),
    areasOfInterest: config.areasOfInterest,
    requiredQuestions: config.requiredQuestions,
    metadataPrompts: config.metadataPrompts,
  })
}

export function createParticipantSession(
  linkToken: string,
  metadata: Record<string, string> = {}
) {
  const store = getStore()
  const project = store.projects.find(
    (record) => record.publicLinkToken === linkToken
  )

  if (!project) {
    return null
  }

  const config = store.configVersions[project.currentConfigVersionId]
  const sessionId = `sess-${crypto.randomUUID()}`
  const startedAt = new Date().toISOString()
  const resumeExpiresAt = new Date(
    Date.now() + DEFAULT_RESUME_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString()

  const session: ParticipantSession = {
    id: sessionId,
    projectId: project.id,
    projectConfigVersionId: config.id,
    publicLinkToken: linkToken,
    respondentLabel:
      config.anonymityMode === "named"
        ? "Respondent"
        : getAnonymousRespondentLabel(project.projectType),
    status: "in_progress",
    startedAt,
    lastActivityAt: startedAt,
    resumeExpiresAt,
    metadata,
    qualityFlag: false,
    excludedFromSynthesis: false,
    runtimeState: buildInitialRuntimeState(config, new Date()),
  }

  store.sessions[session.id] = session
  store.transcripts[session.id] = []

  return {
    session,
    recoveryToken: signRecoveryToken(session.id, resumeExpiresAt),
  }
}

export function resumeParticipantSession(sessionId: string, token: string) {
  const store = getStore()
  const session = store.sessions[sessionId]

  if (!session) {
    return null
  }

  if (!verifyRecoveryToken(token, sessionId)) {
    return null
  }

  return session
}

export function appendSessionEvents(
  sessionId: string,
  payload: {
    segments?: Omit<
      TranscriptSegment,
      "id" | "createdAt" | "orderIndex" | "sessionId"
    >[]
    runtime?: Partial<ParticipantSession["runtimeState"]>
  }
) {
  const store = getStore()
  const session = store.sessions[sessionId]

  if (!session) {
    return null
  }

  const segments = payload.segments ?? []
  const existing = store.transcripts[sessionId] ?? []
  const createdAt = new Date().toISOString()
  const existingSourceIds = new Set(
    existing.flatMap((segment) =>
      segment.sourceItemId ? [segment.sourceItemId] : []
    )
  )
  const seenPayloadSourceIds = new Set<string>()
  const dedupedSegments = segments.filter((segment) => {
    if (!segment.sourceItemId) {
      return true
    }

    if (
      existingSourceIds.has(segment.sourceItemId) ||
      seenPayloadSourceIds.has(segment.sourceItemId)
    ) {
      return false
    }

    seenPayloadSourceIds.add(segment.sourceItemId)
    return true
  })

  const appended = dedupedSegments.map((segment, index) => ({
    ...segment,
    sessionId,
    id: `seg-${crypto.randomUUID()}`,
    createdAt,
    orderIndex: existing.length + index + 1,
  }))

  store.transcripts[sessionId] = [...existing, ...appended]
  session.lastActivityAt = createdAt
  if (payload.runtime) {
    session.runtimeState = {
      ...session.runtimeState,
      ...payload.runtime,
    }
  }

  return appended
}

export function completeParticipantSession(
  sessionId: string,
  runtimePatch?: Partial<ParticipantSession["runtimeState"]>
) {
  const store = getStore()
  const session = store.sessions[sessionId]

  if (!session) {
    return null
  }

  session.status = "complete"
  session.completedAt = new Date().toISOString()
  session.lastActivityAt = session.completedAt
  session.runtimeState = {
    ...session.runtimeState,
    ...runtimePatch,
    state: "complete",
    pausedAt: undefined,
  }

  const jobs = buildCompletionJobs(session.id, session.projectId)
  store.jobs.push(...jobs)

  return {
    session,
    jobs,
  }
}

export function claimAnalysisJobs(limit = 4) {
  const store = getStore()
  const nowIso = new Date().toISOString()
  const available = store.jobs
    .filter(
      (job) =>
        job.status === "queued" &&
        new Date(job.nextAttemptAt).getTime() <= Date.now()
    )
    .slice(0, limit)

  available.forEach((job) => {
    job.status = "processing"
    job.lockedAt = nowIso
  })

  return available
}

export function processQueuedJobs(limit = 4) {
  const jobs = claimAnalysisJobs(limit)

  jobs.forEach((job) => {
    job.status = "completed"
    job.lockedAt = new Date().toISOString()
  })

  return jobs
}

export function getQueuedJobs() {
  return getStore().jobs
}

export function getParticipantSession(sessionId: string) {
  return getStore().sessions[sessionId] ?? null
}

export function createProjectFromForm(input: {
  projectType: string
  name: string
  objective: string
  areasOfInterest: string
  requiredQuestions: string
  durationCapMinutes: number
  anonymityMode: string
}) {
  const store = getStore()
  const projectId = `proj-${crypto.randomUUID()}`
  const configId = `cfg-${crypto.randomUUID()}`
  const createdAt = new Date().toISOString()
  const projectType: ProjectType = isProjectType(input.projectType)
    ? input.projectType
    : DEFAULT_CREATE_PROJECT_TYPE
  const preset = getProjectTypePreset(projectType)

  const areasOfInterest = input.areasOfInterest
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
  const requiredQuestions = input.requiredQuestions
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((prompt, index) => ({
      id: `q-${index + 1}`,
      prompt,
      goal: "Consultant supplied question.",
    }))

  const project: ProjectRecord = {
    id: projectId,
    workspaceId: store.workspace.id,
    projectType,
    name: input.name || "Untitled project",
    slug: (input.name || "untitled-project")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, ""),
    createdAt,
    updatedAt: createdAt,
    status: "draft",
    currentConfigVersionId: configId,
    publicLinkToken: `link-${crypto.randomUUID()}`,
  }

  const configVersion: ProjectConfigVersion = {
    id: configId,
    projectId,
    versionNumber: 1,
    createdAt,
    objective: input.objective || preset.objective,
    areasOfInterest:
      areasOfInterest.length > 0 ? areasOfInterest : preset.areasOfInterest,
    requiredQuestions:
      requiredQuestions.length > 0
        ? requiredQuestions
        : preset.requiredQuestions.map((prompt, index) => ({
            id: `q-default-${index + 1}`,
            prompt,
            goal: "Mode starter question.",
          })),
    durationCapMinutes: Number.isFinite(input.durationCapMinutes)
      ? input.durationCapMinutes
      : preset.durationCapMinutes,
    interviewMode: "strict",
    anonymityMode: (["named", "pseudonymous", "anonymous"].includes(
      input.anonymityMode
    )
      ? input.anonymityMode
      : preset.anonymityMode) as AnonymityMode,
    toneStyle: preset.toneStyle,
    metadataPrompts: [],
    prohibitedTopics: [],
    followUpLimit: preset.followUpLimit,
  }

  store.projects.unshift(project)
  store.configVersions[configId] = configVersion
  store.syntheses[projectId] = {
    id: `syn-${projectId}`,
    projectId,
    includedSessionIds: [],
    executiveSummary: "",
    crossInterviewThemes: [],
    contradictionMap: [],
    alignmentSignals: [],
    misalignmentSignals: [],
    topProblems: [],
    recommendedFocusAreas: [],
    notableQuotesByTheme: [],
    warning:
      "Synthesis will strengthen after the first completed interviews arrive.",
    promptVersionId: "prompt-synthesis-v1",
    modelVersionId: "model-gpt-4.1-mini",
    createdAt,
  }

  return {
    project,
    configVersion,
  }
}

export function enqueueSynthesisRefresh(projectId: string) {
  const store = getStore()
  const job: AnalysisJob = {
    id: `project_synthesis-${projectId}-${crypto.randomUUID()}`,
    type: "project_synthesis",
    status: "queued",
    projectId,
    payload: { projectId, manual: true },
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }

  store.jobs.push(job)
  return job
}

export function setSessionExcludedFromSynthesis(
  sessionId: string,
  excluded: boolean
) {
  const session = getStore().sessions[sessionId]

  if (!session) {
    return null
  }

  session.excludedFromSynthesis = excluded
  return session
}

export function saveSessionOverride(
  sessionId: string,
  editedSummary: string,
  consultantNotes: string
) {
  const store = getStore()
  const existing = store.outputOverrides[sessionId]

  store.outputOverrides[sessionId] = {
    id: existing?.id ?? `override-${sessionId}`,
    sessionId,
    editedSummary,
    suppressedClaimIds: existing?.suppressedClaimIds ?? [],
    consultantNotes,
    updatedAt: new Date().toISOString(),
  }

  return store.outputOverrides[sessionId]
}
