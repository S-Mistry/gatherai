import type {
  ContradictionItem,
  EvidenceRef,
  ParticipantSession,
  ProjectConfigVersion,
  ProjectRecord,
  ProjectSynthesisGenerated,
  QualityDimension,
  QualityScore,
  SessionOutputGenerated,
  TranscriptSegment,
} from "@/lib/domain/types"

function buildEvidence(
  sessionId: string,
  transcript: TranscriptSegment[],
  rationale: string
): EvidenceRef[] {
  const segmentIds = transcript
    .filter((segment) => segment.speaker === "participant")
    .slice(0, 2)
    .map((segment) => segment.id)

  return [
    {
      sessionId,
      segmentIds,
      rationale,
    },
  ]
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function participantTranscript(transcript: TranscriptSegment[]) {
  return transcript.filter((segment) => segment.speaker === "participant")
}

export function buildGeneratedOutputPlaceholder(
  session: ParticipantSession,
  config: ProjectConfigVersion
): SessionOutputGenerated {
  return {
    id: `pending-${session.id}`,
    sessionId: session.id,
    cleanedTranscript: "",
    summary: "",
    questionAnswers: config.requiredQuestions.map((question) => ({
      questionId: question.id,
      prompt: question.prompt,
      answer: "No generated answer is available yet.",
      confidence: 0,
      evidence: [],
    })),
    questionReviews: config.requiredQuestions.map((question) => ({
      questionId: question.id,
      prompt: question.prompt,
      status: "missing" as const,
      answer: "No generated answer is available yet.",
      confidence: 0,
      keyPoints: [],
      evidence: [],
      evidenceQuotes: [],
      followUpQuestions: [question.prompt],
    })),
    themes: [],
    painPoints: [],
    opportunities: [],
    risks: [],
    keyQuotes: [],
    quoteLibrary: [],
    insightCards: [],
    tensions: [],
    unresolvedQuestions: config.requiredQuestions.map(
      (question) => question.prompt
    ),
    projectImplications: [],
    recommendedActions: [],
    analysisWarnings: [],
    confidenceScore: 0,
    respondentProfile: session.metadata,
    promptVersionId: "pending",
    modelVersionId: "pending",
    createdAt: new Date().toISOString(),
  }
}

export function buildSessionOutput(
  session: ParticipantSession,
  config: ProjectConfigVersion,
  transcript: TranscriptSegment[],
  promptVersionId: string,
  modelVersionId: string
): SessionOutputGenerated {
  const participantSegments = participantTranscript(transcript)
  const cleanedTranscript = participantSegments
    .map((segment) => segment.text)
    .join(" ")
    .trim()
  const primaryAnswer =
    participantSegments[0]?.text ??
    "No participant answer has been captured yet for this interview."
  const focusAreas = config.areasOfInterest.slice(0, 3)
  const evidence = buildEvidence(
    session.id,
    transcript,
    "Generated placeholder output based on captured participant transcript."
  )
  const confidence = Math.min(
    0.9,
    0.35 + Math.min(participantSegments.length, 6) * 0.08
  )

  return {
    id: `generated-${session.id}`,
    sessionId: session.id,
    cleanedTranscript:
      cleanedTranscript || "No participant transcript captured yet.",
    summary:
      primaryAnswer ===
      "No participant answer has been captured yet for this interview."
        ? primaryAnswer
        : `The respondent emphasized ${primaryAnswer.toLowerCase()}`,
    questionAnswers: config.requiredQuestions.map((question, index) => ({
      questionId: question.id,
      prompt: question.prompt,
      answer: participantSegments[index]?.text ?? primaryAnswer,
      confidence: Number(Math.max(0.2, confidence - index * 0.05).toFixed(2)),
      evidence,
    })),
    questionReviews: config.requiredQuestions.map((question, index) => ({
      questionId: question.id,
      prompt: question.prompt,
      status: participantSegments[index] ? ("answered" as const) : ("partial" as const),
      answer: participantSegments[index]?.text ?? primaryAnswer,
      confidence: Number(Math.max(0.2, confidence - index * 0.05).toFixed(2)),
      keyPoints: [participantSegments[index]?.text ?? primaryAnswer],
      evidence,
      evidenceQuotes: participantSegments[index]?.text
        ? [participantSegments[index].text]
        : [],
      followUpQuestions: [],
    })),
    themes: uniqueStrings([
      focusAreas[0] ? `${focusAreas[0]} alignment` : "",
      config.requiredQuestions[0]?.goal || "",
    ])
      .slice(0, 2)
      .map((title, index) => ({
        id: `theme-${session.id}-${index + 1}`,
        title,
        summary:
          participantSegments[index]?.text ??
          "A clear theme will appear here once enough transcript evidence has been captured.",
        frequency: participantSegments.length > 0 ? 1 : 0,
        evidence,
      })),
    painPoints: [
      {
        id: `pain-${session.id}-1`,
        label: focusAreas[0]
          ? `${focusAreas[0]} friction`
          : "Interview friction",
        summary: primaryAnswer,
        evidence,
      },
    ],
    opportunities: [
      {
        id: `opportunity-${session.id}-1`,
        label: "Project opportunity",
        summary: `Use the next session or decision review to resolve ${focusAreas[0] ?? "the highest-priority friction point"} with explicit examples.`,
        evidence,
      },
    ],
    risks: [
      {
        id: `risk-${session.id}-1`,
        label: "Open risk",
        summary: config.prohibitedTopics[0]
          ? `Avoid drifting into ${config.prohibitedTopics[0]} while exploring the respondent's concerns.`
          : "A longer transcript is needed before risks can be assessed with confidence.",
        evidence,
      },
    ],
    keyQuotes: participantSegments.slice(0, 1).map((segment, index) => ({
      id: `quote-${session.id}-${index + 1}`,
      label: "Representative quote",
      summary: segment.text,
      evidence: [
        {
          sessionId: session.id,
          segmentIds: [segment.id],
          rationale: "Direct participant quote captured in the transcript.",
        },
      ],
    })),
    quoteLibrary: participantSegments.slice(0, 2).map((segment, index) => ({
      id: `quote-library-${session.id}-${index + 1}`,
      label: `Quote ${index + 1}`,
      excerpt: segment.text,
      context: "Participant quote captured in the transcript.",
      questionIds: config.requiredQuestions.slice(0, 1).map((question) => question.id),
      themeHints: focusAreas.slice(0, 2),
      evidence: [
        {
          sessionId: session.id,
          segmentIds: [segment.id],
          rationale: "Direct participant quote captured in the transcript.",
        },
      ],
    })),
    insightCards: [
      {
        id: `insight-${session.id}-1`,
        kind: "theme",
        title: focusAreas[0] ? `${focusAreas[0]} bottleneck` : "Emerging theme",
        summary: primaryAnswer,
        priority: "medium",
        evidence,
        evidenceQuotes: participantSegments.slice(0, 1).map((segment) => segment.text),
      },
    ],
    tensions: [],
    unresolvedQuestions: config.requiredQuestions
      .filter((question) =>
        session.runtimeState.remainingQuestionIds.includes(question.id)
      )
      .map((question) => question.prompt),
    projectImplications: [
      "Use this interview as a starting point for project framing.",
    ],
    recommendedActions: [
      "Confirm the highest-friction approval path with additional stakeholders.",
    ],
    analysisWarnings: [],
    confidenceScore: Number(confidence.toFixed(2)),
    respondentProfile: session.metadata,
    promptVersionId,
    modelVersionId,
    createdAt: new Date().toISOString(),
  }
}

export function buildQualityScore(
  session: ParticipantSession,
  config: ProjectConfigVersion,
  transcript: TranscriptSegment[],
  scorerSource: "braintrust" | "application" = "application"
): QualityScore {
  const participantSegments = participantTranscript(transcript)
  const answeredQuestions = Math.max(
    session.runtimeState.askedQuestionIds.length,
    Math.min(participantSegments.length, config.requiredQuestions.length)
  )
  const coverage = config.requiredQuestions.length
    ? answeredQuestions / config.requiredQuestions.length
    : 1
  const specificity = Math.min(
    1,
    participantSegments.map((segment) => segment.text).join(" ").length / 320
  )
  const repetition = Number(
    Math.max(0, 1 - session.runtimeState.repetitionScore).toFixed(2)
  )
  const usefulness = Number(
    Math.min(1, 0.3 + coverage * 0.4 + specificity * 0.3).toFixed(2)
  )
  const overall = Number(
    (
      coverage * 0.35 +
        specificity * 0.25 +
        repetition * 0.15 +
        usefulness * 0.25 || 0
    ).toFixed(2)
  )
  const lowQuality = overall < 0.55

  const dimensions: QualityDimension[] = [
    {
      key: "question_coverage",
      score: Number(coverage.toFixed(2)),
      rationale:
        "Measures how many required questions have enough transcript evidence.",
    },
    {
      key: "answer_specificity",
      score: Number(specificity.toFixed(2)),
      rationale:
        "Measures whether participant answers include concrete detail rather than short placeholders.",
    },
    {
      key: "repetition",
      score: repetition,
      rationale:
        "Uses the runtime repetition signal as a coarse proxy for novelty.",
    },
    {
      key: "faithfulness",
      score: transcript.length > 0 ? 0.85 : 0.2,
      rationale:
        "Placeholder analysis is grounded only in persisted transcript segments.",
    },
    {
      key: "decision_usefulness",
      score: usefulness,
      rationale:
        "Measures whether the session is sufficiently complete to influence planning or improvement decisions.",
    },
  ]

  return {
    id: `quality-${session.id}`,
    sessionId: session.id,
    overall,
    lowQuality,
    dimensions,
    scorerSource,
    updatedAt: new Date().toISOString(),
  }
}

export function buildEmptyProjectSynthesis(
  projectId: string,
  promptVersionId: string,
  modelVersionId: string
): ProjectSynthesisGenerated {
  return {
    id: `synthesis-${projectId}-empty`,
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
    promptVersionId,
    modelVersionId,
    createdAt: new Date().toISOString(),
  }
}

export function buildProjectSynthesis(
  project: ProjectRecord,
  sessions: ParticipantSession[],
  outputs: SessionOutputGenerated[],
  promptVersionId: string,
  modelVersionId: string
): ProjectSynthesisGenerated {
  const includedSessions = sessions.filter(
    (session) => session.status === "complete" && !session.excludedFromSynthesis
  )

  if (includedSessions.length === 0 || outputs.length === 0) {
    return buildEmptyProjectSynthesis(
      project.id,
      promptVersionId,
      modelVersionId
    )
  }

  const themeCount = new Map<
    string,
    {
      summary: string
      frequency: number
      evidence: EvidenceRef[]
      sessionSummaries: string[]
    }
  >()

  outputs.forEach((output) => {
    output.themes.forEach((theme) => {
      const existing = themeCount.get(theme.title)
      if (existing) {
        existing.frequency += Math.max(theme.frequency, 1)
        existing.evidence.push(...theme.evidence)
        if (output.summary) {
          existing.sessionSummaries.push(output.summary)
        }
      } else {
        themeCount.set(theme.title, {
          summary: theme.summary,
          frequency: Math.max(theme.frequency, 1),
          evidence: [...theme.evidence],
          sessionSummaries: output.summary ? [output.summary] : [],
        })
      }
    })
  })

  const crossInterviewThemes = [...themeCount.entries()]
    .slice(0, 3)
    .map(([title, value], index) => ({
      id: `synthesis-theme-${project.id}-${index + 1}`,
      title,
      summary:
        value.sessionSummaries[0] && value.sessionSummaries[0] !== value.summary
          ? `${value.summary} ${value.sessionSummaries[0]}`
          : value.summary,
      frequency: value.frequency,
      evidence: value.evidence.slice(0, 3),
    }))

  const contradictionMap: ContradictionItem[] =
    includedSessions.length > 1
      ? [
          {
            id: `contradiction-${project.id}-1`,
            topic: "Where workshop attention should start",
            positions: [
              "Some stakeholders emphasize decision clarity first.",
              "Others emphasize process simplification first.",
            ],
            evidence: crossInterviewThemes[0]?.evidence.slice(0, 2) ?? [],
          },
        ]
      : []

  const topProblems = uniqueStrings(
    outputs.flatMap((output) => output.painPoints.map((claim) => claim.label))
  ).slice(0, 3)
  const recommendedFocusAreas = uniqueStrings([
    "Clarify the highest-friction decision path",
    "Review transcript-backed pain points",
    "Agree an exception-handling pilot",
    "Lock follow-up owners and timing",
  ]).slice(0, 4)
  const notableQuotesByTheme = outputs
    .flatMap((output) => output.keyQuotes)
    .slice(0, 3)

  return {
    id: `synthesis-${project.id}-${Date.now()}`,
    projectId: project.id,
    includedSessionIds: includedSessions.map((session) => session.id),
    executiveSummary:
      "Project synthesis will strengthen as more interviews complete with usable evidence.",
    crossInterviewThemes,
    contradictionMap,
    alignmentSignals: crossInterviewThemes.map((theme) => theme.title).slice(0, 3),
    misalignmentSignals:
      contradictionMap.length > 0 ? contradictionMap.map((item) => item.topic) : [],
    topProblems,
    recommendedFocusAreas,
    notableQuotesByTheme,
    warning:
      includedSessions.length < 2
        ? "Synthesis confidence is still early because fewer than two completed sessions are included."
        : undefined,
    promptVersionId,
    modelVersionId,
    createdAt: new Date().toISOString(),
  }
}
