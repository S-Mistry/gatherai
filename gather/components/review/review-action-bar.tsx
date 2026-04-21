"use client"

import Link from "next/link"
import {
  AlertDialog as RadixAlertDialog,
  DropdownMenu as RadixDropdownMenu,
  Popover as RadixPopover,
} from "radix-ui"
import {
  ArrowLeft,
  Check,
  DotsThree,
  Eye,
  EyeSlash,
  FileText,
} from "@phosphor-icons/react"

import { toggleSessionExclusionAction } from "@/app/app/actions"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useOptionalReviewSelectionActions } from "./review-selection-context"

type StatusState = "ready" | "pending" | "failed" | "empty" | "idle"

interface StatusPill {
  label: string
  status: StatusState
}

interface ReviewActionBarProps {
  projectId: string
  projectName: string
  sessionId: string
  respondentLabel: string
  excludedFromSynthesis: boolean
  overrideActive: boolean
  qualityOverrideActive: boolean
  statuses: StatusPill[]
}

const statusRank: Record<StatusState, number> = {
  failed: 0,
  pending: 1,
  empty: 2,
  idle: 3,
  ready: 4,
}

function aggregateStatus(statuses: StatusPill[]): StatusState {
  if (statuses.length === 0) {
    return "idle"
  }
  return [...statuses].sort(
    (a, b) => statusRank[a.status] - statusRank[b.status]
  )[0].status
}

function statusVariant(status: StatusState): BadgeProps["variant"] {
  switch (status) {
    case "ready":
      return "success"
    case "pending":
      return "warning"
    case "failed":
      return "danger"
    default:
      return "neutral"
  }
}

function statusLabel(status: StatusState): string {
  switch (status) {
    case "ready":
      return "Ready"
    case "pending":
      return "Pending"
    case "failed":
      return "Failed"
    case "empty":
      return "Empty"
    default:
      return "Idle"
  }
}

export function ReviewActionBar({
  projectId,
  projectName,
  sessionId,
  respondentLabel,
  excludedFromSynthesis,
  overrideActive,
  qualityOverrideActive,
  statuses,
}: ReviewActionBarProps) {
  const aggregate = aggregateStatus(statuses)
  const selection = useOptionalReviewSelectionActions()

  return (
    <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-3 border-b border-border/60 bg-background/82 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          href={`/app/projects/${projectId}`}
          className="focus-ring inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          <span className="truncate">{projectName}</span>
        </Link>
        <span aria-hidden className="text-muted-foreground/50">
          /
        </span>
        <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">
          {respondentLabel}
        </h1>
        {overrideActive ? (
          <Badge variant="accent">Override</Badge>
        ) : null}
        {qualityOverrideActive ? (
          <Badge variant="warning">Manual quality</Badge>
        ) : null}
        {excludedFromSynthesis ? (
          <Badge variant="warning">Excluded</Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <StatusPopover aggregate={aggregate} statuses={statuses} />
        <button
          type="button"
          onClick={() => selection?.toggleDrawer("transcript")}
          className="focus-ring chip gap-1.5 hover:border-primary/40 hover:text-foreground xl:hidden"
        >
          <FileText className="size-3.5" />
          Transcript
        </button>
        <OverflowMenu
          projectId={projectId}
          sessionId={sessionId}
          excludedFromSynthesis={excludedFromSynthesis}
        />
      </div>
    </div>
  )
}

function StatusPopover({
  aggregate,
  statuses,
}: {
  aggregate: StatusState
  statuses: StatusPill[]
}) {
  const variant = statusVariant(aggregate)
  const dotColor =
    variant === "success"
      ? "bg-emerald-500"
      : variant === "warning"
        ? "bg-amber-500"
        : variant === "danger"
          ? "bg-rose-500"
          : "bg-muted-foreground"

  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          className="focus-ring chip gap-2 hover:border-primary/40"
          aria-label={`Pipeline status ${statusLabel(aggregate)}`}
        >
          <span className={cn("size-1.5 rounded-full", dotColor)} />
          <span>{statusLabel(aggregate)}</span>
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={8}
          align="end"
          className={cn(
            "z-50 min-w-[220px] rounded-2xl border border-border/70 bg-popover/95 p-1 shadow-[0_18px_50px_-28px_rgba(23,30,55,0.4)] backdrop-blur",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">
            Pipeline
          </p>
          <ul className="space-y-0.5">
            {statuses.map((status) => {
              const subVariant = statusVariant(status.status)
              const subDot =
                subVariant === "success"
                  ? "bg-emerald-500"
                  : subVariant === "warning"
                    ? "bg-amber-500"
                    : subVariant === "danger"
                      ? "bg-rose-500"
                      : "bg-muted-foreground"
              return (
                <li
                  key={status.label}
                  className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <span className={cn("size-1.5 rounded-full", subDot)} />
                    {status.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {statusLabel(status.status)}
                  </span>
                </li>
              )
            })}
          </ul>
          <RadixPopover.Arrow className="fill-popover/95" />
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}

function OverflowMenu({
  projectId,
  sessionId,
  excludedFromSynthesis,
}: {
  projectId: string
  sessionId: string
  excludedFromSynthesis: boolean
}) {
  return (
    <RadixDropdownMenu.Root>
      <RadixDropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Session actions"
          className="focus-ring inline-flex size-8 items-center justify-center rounded-full border border-border/70 bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
        >
          <DotsThree className="size-4" weight="bold" />
        </button>
      </RadixDropdownMenu.Trigger>
      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          sideOffset={8}
          align="end"
          className={cn(
            "z-50 min-w-[220px] rounded-2xl border border-border/70 bg-popover/95 p-1 shadow-[0_18px_50px_-28px_rgba(23,30,55,0.4)] backdrop-blur",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <ExclusionItem
            projectId={projectId}
            sessionId={sessionId}
            excluded={excludedFromSynthesis}
          />
        </RadixDropdownMenu.Content>
      </RadixDropdownMenu.Portal>
    </RadixDropdownMenu.Root>
  )
}

function ExclusionItem({
  projectId,
  sessionId,
  excluded,
}: {
  projectId: string
  sessionId: string
  excluded: boolean
}) {
  if (excluded) {
    return (
      <form action={toggleSessionExclusionAction}>
        <input type="hidden" name="projectId" value={projectId} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="excluded" value="false" />
        <RadixDropdownMenu.Item asChild>
          <button
            type="submit"
            className="focus-ring flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground outline-none data-[highlighted]:bg-muted"
          >
            <Eye className="size-4 text-muted-foreground" />
            Include in synthesis
            <Check className="ml-auto size-3.5 text-primary" />
          </button>
        </RadixDropdownMenu.Item>
      </form>
    )
  }

  return (
    <RadixAlertDialog.Root>
      <RadixAlertDialog.Trigger asChild>
        <RadixDropdownMenu.Item
          onSelect={(event) => event.preventDefault()}
          className="focus-ring flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-foreground outline-none data-[highlighted]:bg-muted"
        >
          <EyeSlash className="size-4 text-muted-foreground" />
          Exclude from synthesis…
        </RadixDropdownMenu.Item>
      </RadixAlertDialog.Trigger>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <RadixAlertDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl border border-border/70 bg-background/95 p-6 shadow-[0_30px_60px_-30px_rgba(23,30,55,0.45)] backdrop-blur",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        >
          <RadixAlertDialog.Title className="text-base font-semibold tracking-tight text-foreground">
            Exclude from synthesis?
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
            This respondent will be hidden from project-level themes and
            recommendations. The transcript and analysis stay intact and you
            can include them again later.
          </RadixAlertDialog.Description>
          <form
            action={toggleSessionExclusionAction}
            className="mt-6 flex justify-end gap-2"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="excluded" value="true" />
            <RadixAlertDialog.Cancel asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <Button type="submit" variant="destructive" size="sm">
                Exclude
              </Button>
            </RadixAlertDialog.Action>
          </form>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  )
}
