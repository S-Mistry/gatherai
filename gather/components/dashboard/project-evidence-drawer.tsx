"use client"

import Link from "next/link"
import { Dialog as RadixDialog } from "radix-ui"
import { ArrowSquareOut, Quotes, SpinnerGap, X } from "@phosphor-icons/react"
import { useEffect, useRef, type ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type {
  ProjectEvidenceClaimKind,
  ProjectEvidenceDrawerPayload,
} from "@/lib/domain/types"
import { getProjectEvidenceKindLabel } from "@/lib/project-evidence"
import { cn } from "@/lib/utils"

export interface ProjectEvidenceClaimPreview {
  claimId: string
  kind: ProjectEvidenceClaimKind
  title: string
  summary: string
  contextLabel?: string
  contextItems: string[]
  evidenceCount: number
}

interface ProjectEvidenceDrawerProps {
  open: boolean
  claim: ProjectEvidenceClaimPreview | null
  payload: ProjectEvidenceDrawerPayload | null
  status: "idle" | "loading" | "ready" | "error"
  errorMessage?: string
  onOpenChange: (open: boolean) => void
}

export function ProjectEvidenceDrawer({
  open,
  claim,
  payload,
  status,
  errorMessage,
  onOpenChange,
}: ProjectEvidenceDrawerProps) {
  const activeClaim = payload
    ? {
        claimId: payload.claimId,
        kind: payload.kind,
        title: payload.title,
        summary: payload.summary,
        contextLabel: payload.contextLabel,
        contextItems: payload.contextItems,
        evidenceCount: payload.totalEvidenceCount,
      }
    : claim
  const bodyRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open || !bodyRef.current) {
      return
    }

    bodyRef.current.scrollTo({ top: 0, behavior: "auto" })
  }, [open, activeClaim?.claimId, status])

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={cn(
            "fixed inset-0 z-40 bg-[rgba(40,30,18,0.4)] ",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col",
            "border-l border-border/70 bg-background/96 shadow-[var(--shadow-pop)] backdrop-blur",
            "focus:outline-none",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=open]:duration-200",
            "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=closed]:duration-150"
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <Quotes className="size-3.5 text-primary" weight="fill" />
                <RadixDialog.Title asChild>
                  <h2 className="text-sm font-semibold tracking-tight">
                    {activeClaim?.title ?? "Transcript evidence"}
                  </h2>
                </RadixDialog.Title>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {activeClaim
                  ? `${getProjectEvidenceKindLabel(activeClaim.kind)}`
                  : "Select a synthesis claim to inspect its exact transcript evidence."}
              </p>
            </div>
            <RadixDialog.Close asChild>
              <button
                type="button"
                aria-label="Close drawer"
                className=" -mr-1 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </RadixDialog.Close>
          </div>

          <div
            ref={bodyRef}
            className="min-h-0 flex-1 overflow-y-auto px-5 py-4"
          >
            {activeClaim ? (
              <div className="space-y-4">
                <div className="space-y-3 rounded-3xl border border-border/70 bg-background/60 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        activeClaim.kind === "contradiction" ? "warning" : "accent"
                      }
                    >
                      {getProjectEvidenceKindLabel(activeClaim.kind)}
                    </Badge>
                    <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                      {activeClaim.evidenceCount} evidence set
                      {activeClaim.evidenceCount === 1 ? "" : "s"}
                    </span>
                  </div>

                  {activeClaim.summary ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                      {activeClaim.summary}
                    </p>
                  ) : null}

                  {activeClaim.contextItems.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                        {activeClaim.contextLabel ?? "Context"}
                      </p>
                      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-foreground marker:text-muted-foreground">
                        {activeClaim.contextItems.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {payload && payload.totalEvidenceCount > payload.displayedEvidenceCount ? (
                  <p className="text-xs text-muted-foreground">
                    Showing {payload.displayedEvidenceCount} of{" "}
                    {payload.totalEvidenceCount} evidence sets.
                  </p>
                ) : null}

                {payload &&
                payload.displayedEvidenceCount > payload.excerpts.length ? (
                  <p className="text-xs text-muted-foreground">
                    {payload.displayedEvidenceCount - payload.excerpts.length} evidence
                    {" "}
                    {payload.displayedEvidenceCount - payload.excerpts.length === 1
                      ? "set could not be resolved from the saved transcript."
                      : "sets could not be resolved from the saved transcript."}
                  </p>
                ) : null}

                {status === "loading" ? (
                  <DrawerNotice
                    title="Loading excerpts"
                    message="Resolving the exact transcript text behind this synthesis claim."
                    icon={<SpinnerGap className="size-4 animate-spin" />}
                  />
                ) : null}

                {status === "error" ? (
                  <DrawerNotice
                    title="Unable to load evidence"
                    message={
                      errorMessage ??
                      "The cited transcript evidence could not be loaded right now."
                    }
                  />
                ) : null}

                {status === "ready" && payload && payload.excerpts.length === 0 ? (
                  <DrawerNotice
                    title="No excerpts resolved"
                    message="This claim still has evidence refs, but none of the cited transcript rows could be resolved from the saved transcript."
                  />
                ) : null}

                {status === "ready" && payload && payload.excerpts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
                      Exact excerpts
                    </p>
                    <ul className="space-y-3">
                      {payload.excerpts.map((excerpt) => (
                        <li
                          key={`${excerpt.sessionId}:${excerpt.segmentIds.join(",")}`}
                          className="rounded-3xl border border-border/70 bg-background/60 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">
                                {excerpt.respondentLabel}
                              </p>
                              <p className="text-sm leading-6 text-muted-foreground">
                                {excerpt.rationale}
                              </p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <Link href={excerpt.reviewHref}>
                                <ArrowSquareOut className="size-3.5" />
                                Open session review
                              </Link>
                            </Button>
                          </div>

                          <div className="mt-4 space-y-2">
                            {excerpt.segments.map((segment) => (
                              <blockquote
                                key={segment.id}
                                className="rounded-2xl border border-[var(--clay-soft)] bg-[var(--clay-soft)] px-4 py-3 text-sm leading-6 text-foreground"
                              >
                                “{segment.text}”
                              </blockquote>
                            ))}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <DrawerNotice
                title="No claim selected"
                message="Select a theme, contradiction, or notable quote to inspect the exact transcript evidence."
              />
            )}
          </div>

          <div className="flex items-center justify-end border-t border-border/60 px-5 py-3">
            <RadixDialog.Close asChild>
              <Button variant="secondary" size="sm">
                Close
              </Button>
            </RadixDialog.Close>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function DrawerNotice({
  title,
  message,
  icon,
}: {
  title: string
  message: string
  icon?: ReactNode
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border/70 bg-background/40 p-4">
      <div className="flex items-center gap-2">
        {icon ?? <Quotes className="size-4 text-muted-foreground" />}
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{message}</p>
    </div>
  )
}
