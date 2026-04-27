import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { ProjectSynthesisOverrideForm } from "@/components/dashboard/project-synthesis-override-form"
import { ProjectEvidenceSurface } from "@/components/dashboard/project-evidence-surface"
import { ProjectVersionForm } from "@/components/dashboard/project-version-form"
import { RefreshSynthesisButton } from "@/components/dashboard/refresh-synthesis-button"
import { SessionsTable } from "@/components/dashboard/sessions-table"
import { TestimonialProjectDetail } from "@/components/dashboard/testimonial-project-detail"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyLink } from "@/components/ui/copy-link"
import { Stamp, Tape } from "@/components/ui/ornaments"
import { RelativeTime } from "@/components/ui/relative-time"
import { getProjectDetail } from "@/lib/data/repository"
import { appUrl } from "@/lib/env"
import { getProjectTypePreset } from "@/lib/project-types"
import { formatProjectSynthesisWarning } from "@/lib/project-synthesis-warning"

interface ProjectDetailPageProps {
  params: Promise<{
    projectId: string
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: ProjectDetailPageProps) {
  const { projectId } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const detail = await getProjectDetail(projectId)

  if (!detail) {
    notFound()
  }

  const headerList = await headers()
  const host = headerList.get("host") ?? ""
  const protocol = headerList.get("x-forwarded-proto") ?? "https"
  const shareUrl = host
    ? `${protocol}://${host}/i/${detail.project.publicLinkToken}`
    : `/i/${detail.project.publicLinkToken}`
  const origin = host ? `${protocol}://${host}` : appUrl

  if (detail.project.projectType === "testimonial") {
    const filterValue = Array.isArray(resolvedSearchParams.reviewFilter)
      ? resolvedSearchParams.reviewFilter[0]
      : resolvedSearchParams.reviewFilter
    const activeFilter =
      filterValue === "all" ||
      filterValue === "approved" ||
      filterValue === "rejected" ||
      filterValue === "pending"
        ? filterValue
        : "pending"

    return (
      <TestimonialProjectDetail
        project={detail.project}
        configVersion={detail.configVersion}
        testimonialLinks={detail.testimonialLinks}
        testimonialReviews={detail.testimonialReviews}
        origin={origin}
        activeFilter={activeFilter}
      />
    )
  }

  const stats = computeSessionStats(detail.sessions)
  const synthesisOverrideActive = Boolean(
    detail.synthesisOverride?.editedNarrative.trim()
  )
  const projectTypePreset = getProjectTypePreset(detail.project.projectType)
  const respondentContext =
    detail.project.projectType === "feedback"
      ? "respondent feedback"
      : "stakeholder inputs"
  const synthesisWarning = formatProjectSynthesisWarning(detail.synthesis.warning)
  const totalSessions = detail.sessions.length
  const includedSessions = stats.includedInSynthesis
  const themesCount = detail.synthesis.crossInterviewThemes.length
  const contradictionsCount = detail.synthesis.contradictionMap.length
  const includedTotalForSpectro = Math.max(includedSessions, 1)

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section
        className="grid items-stretch gap-8"
        style={{ gridTemplateColumns: "1.25fr 1fr" }}
      >
        <div className="card flat relative" style={{ padding: "38px 42px" }}>
          <Tape style={{ top: -11, left: "50%", transform: "translateX(-50%) rotate(2deg)" }} />
          <div className="font-hand text-[26px] text-[var(--clay)]">
            what we heard —
          </div>
          <h1
            className="font-serif"
            style={{
              fontSize: 56,
              fontWeight: 400,
              lineHeight: 1.05,
              margin: "12px 0 20px",
              letterSpacing: "-0.018em",
            }}
          >
            <span style={{ color: "var(--ink-2)" }}>
              {includedSessions || stats.completed || 0}{" "}
              {includedSessions === 1 ? "voice" : "voices"}.
            </span>
            <br />
            <span style={{ fontStyle: "italic", color: "var(--clay)" }}>
              {detail.project.name}
            </span>
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--ink-2)",
              maxWidth: 560,
              margin: 0,
            }}
          >
            {detail.synthesis.executiveSummary ||
              "Synthesis will strengthen after the first completed sessions with usable evidence arrive."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3.5">
            {synthesisOverrideActive ? (
              <Stamp variant="ink">narrative override</Stamp>
            ) : includedSessions >= 3 ? (
              <Stamp>workshop ready</Stamp>
            ) : null}
            <span className="font-mono text-[11px] text-[var(--ink-3)]">
              {includedSessions}/{totalSessions} interviews ·{" "}
              {totalSessions - includedSessions} excluded · v
              {detail.configVersion.versionNumber}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <CopyLink value={shareUrl} label="Copy share link" />
            <Button asChild variant="ghost" size="sm">
              <Link href={`/i/${detail.project.publicLinkToken}`}>
                Preview as respondent
              </Link>
            </Button>
            <RefreshSynthesisButton projectId={detail.project.id} />
          </div>
        </div>

        <div className="grid gap-3.5" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <BigStat
            big={String(includedSessions)}
            small={`/${totalSessions}`}
            label="interviews"
            note={
              totalSessions - includedSessions === 0
                ? "all included"
                : `${totalSessions - includedSessions} excluded`
            }
            tone="ink"
          />
          <BigStat
            big={String(themesCount)}
            small="themes"
            label="cross-interview"
            note={themesCount === 0 ? "none surfaced yet" : "open for evidence"}
            tone="clay"
          />
          <BigStat
            big={String(contradictionsCount)}
            small="open"
            label="contradictions"
            note={contradictionsCount === 0 ? "no tensions" : "unresolved"}
            tone="rose"
          />
          <BigStat
            big={String(stats.flagged)}
            small="flagged"
            label="quality"
            note={stats.flagged === 0 ? "clean" : "needs your eye"}
            tone="sage"
          />
        </div>
      </section>

      {/* Synthesis readout */}
      <section className="card flat" style={{ padding: "28px 32px" }}>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div style={{ maxWidth: 620 }}>
            <span className="eyebrow">Synthesis readout</span>
            <h2
              className="font-serif mt-3"
              style={{ fontSize: 30, fontWeight: 400, margin: "10px 0 10px" }}
            >
              Grounded in the latest effective {respondentContext}.
            </h2>
            <p
              className="font-sans"
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                margin: 0,
              }}
            >
              {detail.synthesis.includedSessionIds.length}{" "}
              {detail.synthesis.includedSessionIds.length === 1
                ? "session is"
                : "sessions are"}{" "}
              included in this synthesis.
            </p>
          </div>
          {synthesisWarning ? (
            <p
              className="font-sans"
              style={{
                background: "var(--gold-soft)",
                border: "1px solid rgba(200,160,60,0.3)",
                borderRadius: 8,
                color: "var(--ink-2)",
                fontSize: 13,
                lineHeight: 1.55,
                margin: 0,
                maxWidth: 420,
                padding: "12px 16px",
              }}
            >
              {synthesisWarning}
            </p>
          ) : null}
        </div>

        <div
          className="mt-6 grid gap-4"
          style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
        >
          <BulletBlock
            label="Alignment signals"
            items={detail.synthesis.alignmentSignals}
            emptyMessage="No alignment signals surfaced yet."
          />
          <BulletBlock
            label="Misalignment signals"
            items={detail.synthesis.misalignmentSignals}
            emptyMessage="No misalignment signals surfaced yet."
          />
          <BulletBlock
            label="Top pain points"
            items={detail.synthesis.topProblems}
            emptyMessage="No pain points surfaced yet."
          />
          <BulletBlock
            label={projectTypePreset.focusAreasLabel}
            items={detail.synthesis.recommendedFocusAreas}
            ordered
            emptyMessage="Recommended focus areas appear once synthesis runs."
          />
        </div>
      </section>

      {/* Themes / quotes / contradictions (evidence surface) */}
      <ProjectEvidenceSurface
        projectId={detail.project.id}
        contradictions={detail.synthesis.contradictionMap}
        notableQuotes={detail.synthesis.notableQuotesByTheme}
        themes={detail.synthesis.crossInterviewThemes}
        totalSessions={includedTotalForSpectro}
      />

      {/* Sessions */}
      <section className="space-y-5">
        <div className="flex items-baseline gap-3.5">
          <h2 className="font-serif" style={{ fontSize: 28, fontWeight: 400, margin: 0 }}>
            Who we talked to
          </h2>
          <span className="font-hand" style={{ fontSize: 18, color: "var(--ink-3)" }}>
            — {detail.sessions.length}{" "}
            {detail.sessions.length === 1 ? "session" : "sessions"} · click for the transcript
          </span>
        </div>
        <SessionsTable
          projectId={projectId}
          sessions={detail.sessions}
          qualityScores={detail.qualityScores}
        />
      </section>

      {/* Setup + history */}
      <section
        className="grid gap-7"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        <div className="card flat" style={{ padding: "26px 28px" }}>
          <span className="eyebrow">Collection setup</span>
          <h3
            className="font-serif mt-3"
            style={{ fontSize: 24, fontWeight: 400, margin: "8px 0 14px" }}
          >
            What you asked for
          </h3>
          {detail.configVersion.areasOfInterest.length > 0 ? (
            <>
              <div
                className="font-hand"
                style={{ fontSize: 20, color: "var(--clay)", marginBottom: 6 }}
              >
                topics —
              </div>
              <ul
                className="font-sans"
                style={{
                  margin: "0 0 16px",
                  paddingLeft: 18,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                }}
              >
                {detail.configVersion.areasOfInterest.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </>
          ) : null}
          {detail.configVersion.requiredQuestions.length > 0 ? (
            <>
              <div
                className="font-hand"
                style={{ fontSize: 20, color: "var(--clay)", marginBottom: 6 }}
              >
                must-ask questions —
              </div>
              <ol
                className="font-sans"
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                }}
              >
                {detail.configVersion.requiredQuestions.map((q) => (
                  <li key={q.id ?? q.prompt}>{q.prompt}</li>
                ))}
              </ol>
            </>
          ) : null}
          {detail.configVersion.backgroundContext ? (
            <>
              <div
                className="font-hand mt-4"
                style={{ fontSize: 20, color: "var(--clay)", marginBottom: 6 }}
              >
                background —
              </div>
              <p
                className="font-sans"
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                  margin: 0,
                }}
              >
                {detail.configVersion.backgroundContext}
              </p>
            </>
          ) : null}
        </div>

        <div className="card flat" style={{ padding: "26px 28px" }}>
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Versions</span>
            <span className="font-mono text-[10px] text-[var(--ink-3)]">
              future sessions only
            </span>
          </div>
          <h3
            className="font-serif mt-3"
            style={{ fontSize: 24, fontWeight: 400, margin: "8px 0 14px" }}
          >
            How it has changed
          </h3>
          <div className="space-y-3">
            {detail.configHistory.map((version, index) => (
              <div
                key={version.id}
                style={{
                  border: "1px dashed var(--line)",
                  borderRadius: 6,
                  padding: "14px 18px",
                }}
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <Badge variant={index === 0 ? "clay" : "neutral"}>
                    v{version.versionNumber}
                  </Badge>
                  {index === 0 ? <Badge variant="sage">active</Badge> : null}
                  <span className="font-mono text-[11px] text-[var(--ink-3)]">
                    <RelativeTime date={version.createdAt} />
                  </span>
                </div>
                <p
                  className="font-sans mt-2 mb-0"
                  style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--ink-2)" }}
                >
                  {version.objective}
                </p>
              </div>
            ))}
          </div>

          <details
            className="mt-5"
            style={{
              border: "1px dashed var(--line)",
              borderRadius: 6,
              padding: "14px 18px",
            }}
          >
            <summary
              className="font-hand cursor-pointer"
              style={{ fontSize: 22, color: "var(--clay)", listStyle: "none" }}
            >
              + create next version
            </summary>
            <div className="pt-4">
              <ProjectVersionForm
                project={detail.project}
                configVersion={detail.configVersion}
              />
            </div>
          </details>
        </div>
      </section>

      {/* Override drawer */}
      <details
        className="card flat"
        style={{ padding: "22px 26px" }}
        open={synthesisOverrideActive}
      >
        <summary
          className="cursor-pointer flex items-center justify-between gap-3"
          style={{ listStyle: "none" }}
        >
          <span className="flex items-center gap-2.5">
            <span className="eyebrow">Consultant narrative override</span>
            {synthesisOverrideActive ? <Badge variant="clay">active</Badge> : null}
          </span>
          <span className="font-mono text-[10px] text-[var(--ink-3)]">
            edit readout
          </span>
        </summary>
        <div className="pt-4">
          <ProjectSynthesisOverrideForm
            projectId={detail.project.id}
            generatedNarrative={detail.generatedSynthesis.executiveSummary}
            override={detail.synthesisOverride}
          />
        </div>
      </details>

      {/* keep the project type preset reference quietly used so eslint doesn't dead-code-strip imports */}
      <span className="sr-only">{projectTypePreset.label}</span>
    </div>
  )
}

function computeSessionStats(
  sessions: {
    status: string
    qualityFlag: boolean
    excludedFromSynthesis: boolean
  }[]
) {
  return sessions.reduce(
    (acc, session) => {
      if (session.status === "complete") {
        acc.completed += 1
        if (!session.excludedFromSynthesis) {
          acc.includedInSynthesis += 1
        }
      }
      if (session.status === "in_progress") {
        acc.live += 1
      }
      if (session.qualityFlag) {
        acc.flagged += 1
      }
      return acc
    },
    { completed: 0, live: 0, flagged: 0, includedInSynthesis: 0 }
  )
}

function BulletBlock({
  label,
  items,
  ordered = false,
  emptyMessage,
}: {
  label: string
  items: string[]
  ordered?: boolean
  emptyMessage: string
}) {
  const ListTag = ordered ? "ol" : "ul"

  return (
    <section
      style={{
        background: "rgba(255,255,255,0.45)",
        border: "1px dashed var(--line)",
        borderRadius: 8,
        padding: "18px 20px",
      }}
    >
      <p className="eyebrow" style={{ margin: 0 }}>
        {label}
      </p>
      {items.length === 0 ? (
        <p
          className="font-sans mt-3"
          style={{ color: "var(--ink-3)", fontSize: 13.5, lineHeight: 1.55 }}
        >
          {emptyMessage}
        </p>
      ) : (
        <ListTag
          className="font-sans mt-3"
          style={{
            color: "var(--ink-2)",
            fontSize: 13.5,
            lineHeight: 1.6,
            marginBottom: 0,
            paddingLeft: 18,
          }}
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ListTag>
      )}
    </section>
  )
}

function BigStat({
  big,
  small,
  label,
  note,
  tone,
}: {
  big: string
  small: string
  label: string
  note: string
  tone: "ink" | "clay" | "sage" | "rose"
}) {
  const color =
    tone === "clay"
      ? "var(--clay)"
      : tone === "rose"
        ? "var(--rose)"
        : tone === "sage"
          ? "var(--sage)"
          : "var(--ink)"
  return (
    <div className="card flat" style={{ padding: "20px 22px" }}>
      <div className="eyebrow">{label}</div>
      <div className="flex items-baseline gap-2 mt-1.5">
        <span
          className="font-serif"
          style={{
            fontSize: 56,
            fontWeight: 400,
            lineHeight: 1,
            color,
            fontStyle: tone === "clay" || tone === "rose" ? "italic" : "normal",
          }}
        >
          {big}
        </span>
        <span className="font-mono text-[12px] text-[var(--ink-3)]">{small}</span>
      </div>
      <div
        className="font-sans mt-1.5"
        style={{ fontSize: 12, color: "var(--ink-2)" }}
      >
        {note}
      </div>
    </div>
  )
}
