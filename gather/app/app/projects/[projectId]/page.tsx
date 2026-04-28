import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { ConsultantAppBar } from "@/components/dashboard/consultant-app-bar"
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
      <>
        <ConsultantAppBar
          crumb={[
            { label: "Workspace", href: "/app" },
            { label: detail.project.name },
          ]}
        />
        <div style={{ padding: "36px 40px 120px", maxWidth: 1320, margin: "0 auto" }}>
          <TestimonialProjectDetail
            project={detail.project}
            configVersion={detail.configVersion}
            testimonialLinks={detail.testimonialLinks}
            testimonialReviews={detail.testimonialReviews}
            origin={origin}
            activeFilter={activeFilter}
          />
        </div>
      </>
    )
  }

  const stats = computeSessionStats(detail.sessions)
  const synthesisOverrideActive = Boolean(
    detail.synthesisOverride?.editedNarrative.trim()
  )
  const projectTypePreset = getProjectTypePreset(detail.project.projectType)
  const synthesisWarning = formatProjectSynthesisWarning(detail.synthesis.warning)
  const totalSessions = detail.sessions.length
  const includedSessions = stats.includedInSynthesis
  const themesCount = detail.synthesis.crossInterviewThemes.length
  const contradictionsCount = detail.synthesis.contradictionMap.length
  const includedTotalForSpectro = Math.max(includedSessions, 1)

  return (
    <>
      <ConsultantAppBar
        crumb={[
          { label: "Workspace", href: "/app" },
          { label: detail.project.name },
        ]}
      />
      <div style={{ padding: "36px 40px 120px", maxWidth: 1320, margin: "0 auto" }}>
        {/* ── Hero ─────────────────────────────────── */}
      <section
        className="project-detail-hero-grid"
        style={{
          gap: 36,
          marginBottom: 56,
        }}
      >
        <div className="card flat relative" style={{ padding: "38px 42px" }}>
          <Tape
            style={{
              top: -11,
              left: "50%",
              transform: "translateX(-50%) rotate(2deg)",
            }}
          />
          <div className="font-hand" style={{ fontSize: 26, color: "var(--clay)" }}>
            what we heard —
          </div>
          <h1
            className="font-serif"
            style={{
              fontSize: 60,
              fontWeight: 400,
              lineHeight: 1.05,
              margin: "12px 0 26px",
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
              maxWidth: 540,
              margin: 0,
            }}
          >
            {detail.synthesis.executiveSummary ||
              "Synthesis will strengthen after the first completed sessions with usable evidence arrive."}
          </p>
          <div
            style={{
              marginTop: 26,
              display: "flex",
              gap: 14,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {synthesisOverrideActive ? (
              <Stamp variant="ink">narrative override</Stamp>
            ) : includedSessions >= 3 ? (
              <Stamp>synthesis ready</Stamp>
            ) : null}
            <span
              className="font-mono"
              style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
              {includedSessions}/{totalSessions} interviews
              {totalSessions - includedSessions > 0
                ? ` · ${totalSessions - includedSessions} excluded for low coverage`
                : ""}
            </span>
          </div>
          <div
            className="flex flex-wrap items-center gap-3"
            style={{ marginTop: 22 }}
          >
            <CopyLink value={shareUrl} label="Copy share link" />
            <Button asChild variant="ghost" size="sm">
              <Link href={`/i/${detail.project.publicLinkToken}`}>
                Preview as respondent
              </Link>
            </Button>
            <RefreshSynthesisButton projectId={detail.project.id} />
          </div>
        </div>

        {/* Stat tiles */}
        <div
          className="project-detail-stat-grid"
          style={{
            gap: 14,
          }}
        >
          <BigStat
            big={String(includedSessions)}
            small={`/${totalSessions}`}
            label="interviews"
            note={
              totalSessions - includedSessions === 0
                ? "all included"
                : `${totalSessions - includedSessions} excluded · low coverage`
            }
            tone="ink"
          />
          <BigStat
            big={String(themesCount)}
            small="themes"
            label="cross-interview"
            note={themesCount === 0 ? "none surfaced yet" : "frequency ≥ 3"}
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

      {/* ── Who we talked to ───────────────────── */}
      <section style={{ marginBottom: 56 }}>
        <div className="section-head">
          <h2 className="font-serif" style={{ fontSize: 32, fontWeight: 400 }}>
            Who we talked to
          </h2>
          <span
            className="font-hand"
            style={{ fontSize: 20, color: "var(--ink-3)" }}
          >
            — click anyone for their transcript
          </span>
        </div>
        <SessionsAtAGlance
          projectId={projectId}
          sessions={detail.sessions}
          qualityScores={detail.qualityScores}
        />
      </section>

      {/* ── Themes / Quotes / Contradictions ─────── */}
      <ProjectEvidenceSurface
        projectId={detail.project.id}
        contradictions={detail.synthesis.contradictionMap}
        notableQuotes={detail.synthesis.notableQuotesByTheme}
        themes={detail.synthesis.crossInterviewThemes}
        totalSessions={includedTotalForSpectro}
      />

      {/* ── Optional warning banner ───────────── */}
      {synthesisWarning ? (
        <p
          className="font-sans"
          style={{
            background: "var(--gold-soft)",
            border: "1px solid rgba(200,160,60,0.3)",
            borderRadius: 8,
            padding: "12px 16px",
            fontSize: 13,
            color: "var(--ink-2)",
            margin: "0 0 56px",
          }}
        >
          {synthesisWarning}
        </p>
      ) : null}

      {/* ── Project setup (collapsed by default) ─── */}
      <details
        className="card flat"
        style={{ padding: "22px 26px", marginBottom: 24 }}
      >
        <summary
          className="cursor-pointer flex items-center justify-between gap-3"
          style={{ listStyle: "none" }}
        >
          <span className="flex items-center gap-2.5">
            <span className="eyebrow">Project setup</span>
            <Badge variant="neutral">v{detail.configVersion.versionNumber}</Badge>
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 10, color: "var(--ink-3)" }}
          >
            topics · questions · history
          </span>
        </summary>
        <div className="project-detail-two-column-grid mt-6 gap-7">
          <div>
            <h3
              className="font-serif"
              style={{
                fontSize: 22,
                fontWeight: 400,
                margin: "0 0 12px",
              }}
            >
              What you asked for
            </h3>
            {detail.configVersion.areasOfInterest.length > 0 ? (
              <>
                <div
                  className="font-hand"
                  style={{
                    fontSize: 20,
                    color: "var(--clay)",
                    marginBottom: 6,
                  }}
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
                  style={{
                    fontSize: 20,
                    color: "var(--clay)",
                    marginBottom: 6,
                  }}
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
                  style={{
                    fontSize: 20,
                    color: "var(--clay)",
                    marginBottom: 6,
                  }}
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

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h3
                className="font-serif"
                style={{ fontSize: 22, fontWeight: 400, margin: 0 }}
              >
                How it has changed
              </h3>
              <span
                className="font-mono"
                style={{ fontSize: 10, color: "var(--ink-3)" }}
              >
                future sessions only
              </span>
            </div>
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
                    {index === 0 ? (
                      <Badge variant="sage">active</Badge>
                    ) : null}
                    <span
                      className="font-mono"
                      style={{ fontSize: 11, color: "var(--ink-3)" }}
                    >
                      <RelativeTime date={version.createdAt} />
                    </span>
                  </div>
                  <p
                    className="font-sans mt-2 mb-0"
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.55,
                      color: "var(--ink-2)",
                    }}
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
                style={{
                  fontSize: 22,
                  color: "var(--clay)",
                  listStyle: "none",
                }}
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
        </div>
      </details>

      {/* ── Sessions table (full detail) ──────── */}
      <details
        className="card flat"
        style={{ padding: "22px 26px", marginBottom: 24 }}
      >
        <summary
          className="cursor-pointer flex items-center justify-between gap-3"
          style={{ listStyle: "none" }}
        >
          <span className="flex items-center gap-2.5">
            <span className="eyebrow">Sessions table</span>
            <span
              className="font-mono"
              style={{ fontSize: 11, color: "var(--ink-3)" }}
            >
              {detail.sessions.length}{" "}
              {detail.sessions.length === 1 ? "session" : "sessions"}
            </span>
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 10, color: "var(--ink-3)" }}
          >
            quality · transcripts · exclusion
          </span>
        </summary>
        <div className="pt-6">
          <SessionsTable
            projectId={projectId}
            sessions={detail.sessions}
            qualityScores={detail.qualityScores}
          />
        </div>
      </details>

      {/* ── Override drawer ─────────────────── */}
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
            {synthesisOverrideActive ? (
              <Badge variant="clay">active</Badge>
            ) : null}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 10, color: "var(--ink-3)" }}
          >
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

      <span className="sr-only">{projectTypePreset.label}</span>
      </div>
    </>
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
        <span
          className="font-serif"
          style={{
            fontSize: 56,
            fontWeight: 400,
            lineHeight: 1,
            color,
            fontStyle:
              tone === "clay" || tone === "rose" ? "italic" : "normal",
          }}
        >
          {big}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 12, color: "var(--ink-3)" }}
        >
          {small}
        </span>
      </div>
      <div
        className="font-sans"
        style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}
      >
        {note}
      </div>
    </div>
  )
}

interface SessionAtAGlance {
  id: string
  respondentLabel: string
  status: string
  excludedFromSynthesis: boolean
  qualityFlag: boolean
  metadata?: { dept?: string | null; region?: string | null } | null
}

function SessionsAtAGlance({
  projectId,
  sessions,
  qualityScores,
}: {
  projectId: string
  sessions: SessionAtAGlance[]
  qualityScores: Record<string, { overall: number; lowQuality: boolean } | undefined>
}) {
  if (sessions.length === 0) {
    return (
      <p
        className="font-sans"
        style={{
          border: "1.5px dashed var(--line)",
          borderRadius: 8,
          padding: "18px 20px",
          fontSize: 14,
          color: "var(--ink-3)",
        }}
      >
        Sessions land here as people complete the interview.
      </p>
    )
  }

  return (
    <div
      className="project-sessions-glance-grid"
      style={{
        gap: 12,
      }}
    >
      {sessions.slice(0, 14).map((session, i) => {
        const score = qualityScores[session.id]
        const overall = score ? score.overall : null
        const live = session.status === "in_progress"
        const excluded = session.excludedFromSynthesis
        const initial =
          session.respondentLabel
            .replace(/[^A-Za-z0-9]/g, " ")
            .trim()
            .split(/\s+/)
            .pop()
            ?.charAt(0)
            .toUpperCase() ?? "?"
        return (
          <Link
            key={session.id}
            href={`/app/projects/${projectId}/sessions/${session.id}`}
            style={{
              background: excluded ? "rgba(200,60,60,0.06)" : "var(--card)",
              border: `1px solid ${
                excluded ? "rgba(200,60,60,0.25)" : "var(--line-soft)"
              }`,
              borderRadius: 8,
              padding: "16px 12px",
              opacity: excluded ? 0.65 : 1,
              position: "relative",
              display: "block",
            }}
          >
            {live ? (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--clay)",
                  boxShadow: "0 0 0 3px var(--clay-soft)",
                }}
              />
            ) : null}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `hsl(${(i * 57) % 360} 45% 70%)`,
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "white",
                marginBottom: 8,
              }}
            >
              {initial}
            </div>
            <div
              className="font-sans"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}
            >
              {session.respondentLabel}
            </div>
            {session.metadata?.dept || session.metadata?.region ? (
              <div
                className="font-mono"
                style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 2 }}
              >
                {[session.metadata?.dept, session.metadata?.region]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            ) : null}
            {overall !== null ? (
              <div
                className="font-mono"
                style={{ fontSize: 9.5, color: "var(--ink-3)", marginTop: 6 }}
              >
                quality ·{" "}
                <span
                  style={{
                    color:
                      overall < 0.6 ? "var(--rose)" : "var(--sage)",
                  }}
                >
                  {overall.toFixed(2)}
                </span>
              </div>
            ) : null}
            {live ? (
              <div
                className="font-mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--clay)",
                  marginTop: 6,
                }}
              >
                ● live now
              </div>
            ) : null}
            {excluded ? (
              <div
                className="font-mono"
                style={{
                  fontSize: 9.5,
                  color: "var(--rose)",
                  marginTop: 6,
                }}
              >
                excluded
              </div>
            ) : null}
          </Link>
        )
      })}
    </div>
  )
}
