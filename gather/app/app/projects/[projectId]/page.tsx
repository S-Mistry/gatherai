import Link from "next/link"
import { headers } from "next/headers"
import { notFound } from "next/navigation"

import { RefreshSynthesisButton } from "@/components/dashboard/refresh-synthesis-button"
import { SessionsTable } from "@/components/dashboard/sessions-table"
import { ThemeEvidenceDrawer } from "@/components/dashboard/theme-evidence-drawer"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { CopyLink } from "@/components/ui/copy-link"
import { getProjectDetail } from "@/lib/data/repository"

interface ProjectDetailPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { projectId } = await params
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

  const stats = computeSessionStats(detail.sessions)

  return (
    <div className="stack gap-5">
      <Breadcrumb
        items={[
          { label: "Workspace", href: "/app" },
          { label: "Projects", href: "/app/projects" },
          { label: detail.project.name },
        ]}
      />

      <section className="panel-flush">
        <header className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="stack max-w-3xl gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{detail.project.clientName}</Badge>
              <span className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Version {detail.configVersion.versionNumber}
              </span>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-balance">
              {detail.project.name}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {detail.configVersion.objective}
            </p>
          </div>
          <div className="stack gap-2 lg:items-end">
            <CopyLink
              value={shareUrl}
              label="Copy link"
              className="w-full lg:w-[340px]"
            />
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/i/${detail.project.publicLinkToken}`}>Preview</Link>
              </Button>
              <RefreshSynthesisButton projectId={detail.project.id} />
            </div>
          </div>
        </header>

        <div className="divider" />

        <section className="flex flex-wrap gap-2 px-6 py-4">
          <StatChip label="Done" value={stats.completed} />
          <StatChip label="Live" value={stats.live} />
          <StatChip label="Flagged" value={stats.flagged} tone="warning" />
          <StatChip
            label="In synthesis"
            value={stats.includedInSynthesis}
            tone="accent"
          />
        </section>

        <div className="divider" />

        <section className="stack gap-5 px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="eyebrow-sm">What we&apos;re hearing</h2>
            {detail.synthesis.warning ? (
              <Badge variant="warning">{detail.synthesis.warning}</Badge>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <BulletBlock
              label="Top pain points"
              items={detail.synthesis.topProblems}
              emptyMessage="No pain points surfaced yet."
            />
            <div className="stack gap-5">
              <BulletBlock
                label="Suggested agenda"
                items={detail.synthesis.suggestedWorkshopAgenda}
                ordered
                emptyMessage="Agenda recommendations appear once synthesis runs."
              />
              <div className="divider" />
              <p className="eyebrow-sm">Interview setup</p>
              <BulletBlock
                label="Topics"
                items={detail.configVersion.areasOfInterest}
                emptyMessage="No topics configured."
              />
              <BulletBlock
                label="Must-ask questions"
                items={detail.configVersion.requiredQuestions.map((q) => q.prompt)}
                emptyMessage="No required questions configured."
              />
            </div>
          </div>
        </section>

        <div className="divider" />

        <section className="stack gap-3 px-6 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="eyebrow-sm">Themes across interviews</h2>
            <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              click to expand
            </span>
          </div>
          <ThemeEvidenceDrawer themes={detail.synthesis.crossInterviewThemes} />
        </section>

        <div className="divider" />

        <section className="stack gap-3 px-6 py-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="eyebrow-sm">Sessions</h2>
            <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {detail.sessions.length}{" "}
              {detail.sessions.length === 1 ? "interview" : "interviews"}
            </span>
          </div>
          <SessionsTable
            projectId={projectId}
            sessions={detail.sessions}
            qualityScores={detail.qualityScores}
          />
        </section>

      </section>
    </div>
  )
}

function computeSessionStats(
  sessions: { status: string; qualityFlag: boolean; excludedFromSynthesis: boolean }[]
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

function StatChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string
  value: number
  tone?: "neutral" | "warning" | "accent"
}) {
  const valueColor =
    tone === "warning"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "accent"
        ? "text-primary"
        : "text-foreground"
  return (
    <span className="chip gap-2 px-3 py-1.5">
      <span
        className={`text-base font-semibold tabular-nums leading-none ${valueColor}`}
      >
        {value}
      </span>
      <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </span>
    </span>
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
    <div className="stack gap-2">
      <p className="eyebrow-sm">{label}</p>
      {items.length === 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <ListTag
          className={`stack gap-1.5 text-sm leading-6 text-foreground ${ordered ? "list-decimal pl-5 marker:text-muted-foreground" : "list-disc pl-5 marker:text-muted-foreground"}`}
        >
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ListTag>
      )}
    </div>
  )
}
