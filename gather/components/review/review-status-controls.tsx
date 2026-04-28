"use client"

import {
  AlertDialog as RadixAlertDialog,
  DropdownMenu as RadixDropdownMenu,
  Popover as RadixPopover,
} from "radix-ui"
import {
  Check,
  DotsThree,
  Eye,
  EyeSlash,
  FileText,
} from "@phosphor-icons/react"

import { toggleSessionExclusionAction } from "@/app/app/actions"
import { Button } from "@/components/ui/button"
import { type BadgeProps } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import { useOptionalReviewSelectionActions } from "./review-selection-context"

export type StatusState = "ready" | "pending" | "failed" | "empty" | "idle"

export interface StatusPill {
  label: string
  status: StatusState
}

const statusRank: Record<StatusState, number> = {
  failed: 0,
  pending: 1,
  empty: 2,
  idle: 3,
  ready: 4,
}

function aggregateStatus(statuses: StatusPill[]): StatusState {
  if (statuses.length === 0) return "idle"
  return [...statuses].sort(
    (a, b) => statusRank[a.status] - statusRank[b.status]
  )[0].status
}

function statusVariant(status: StatusState): BadgeProps["variant"] {
  switch (status) {
    case "ready":
      return "sage"
    case "pending":
      return "gold"
    case "failed":
      return "rose"
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

const POPOVER_CLASS =
  "z-50 min-w-[220px] rounded-md p-1 shadow-[var(--shadow-pop)] " +
  "data-[state=open]:animate-in data-[state=open]:fade-in-0 " +
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"

export function ReviewStatusControls({
  projectId,
  sessionId,
  excludedFromSynthesis,
  statuses,
}: {
  projectId: string
  sessionId: string
  excludedFromSynthesis: boolean
  statuses: StatusPill[]
}) {
  const aggregate = aggregateStatus(statuses)
  const selection = useOptionalReviewSelectionActions()

  return (
    <div className="flex items-center gap-2">
      <StatusPopover aggregate={aggregate} statuses={statuses} />
      <button
        type="button"
        onClick={() => selection?.toggleDrawer("transcript")}
        className="chip xl:hidden"
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

  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>
        <button
          type="button"
          className={cn("chip", variant)}
          aria-label={`Pipeline status ${statusLabel(aggregate)}`}
        >
          <span className="dot" />
          <span>{statusLabel(aggregate)}</span>
        </button>
      </RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          sideOffset={8}
          align="end"
          className={POPOVER_CLASS}
          style={{ background: "var(--card)", border: "1px solid var(--line)" }}
        >
          <p className="eyebrow px-3 pt-2 pb-1">Pipeline</p>
          <ul className="space-y-0.5">
            {statuses.map((status) => {
              const subVariant = statusVariant(status.status)
              return (
                <li
                  key={status.label}
                  className="font-sans flex items-center justify-between gap-4 rounded-md px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2 text-[var(--ink)]">
                    <span
                      className={cn("chip", subVariant)}
                      style={{ padding: "0 6px", fontSize: 0 }}
                    >
                      <span
                        className="dot"
                        style={{ width: 6, height: 6, margin: 0 }}
                      />
                    </span>
                    {status.label}
                  </span>
                  <span className="text-xs text-[var(--ink-3)]">
                    {statusLabel(status.status)}
                  </span>
                </li>
              )
            })}
          </ul>
          <RadixPopover.Arrow style={{ fill: "var(--card)" }} />
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
          className="inline-flex size-8 items-center justify-center rounded-full text-[var(--ink-3)] hover:text-[var(--ink)]"
          style={{
            border: "1px solid var(--line)",
            background: "var(--card)",
          }}
        >
          <DotsThree className="size-4" weight="bold" />
        </button>
      </RadixDropdownMenu.Trigger>
      <RadixDropdownMenu.Portal>
        <RadixDropdownMenu.Content
          sideOffset={8}
          align="end"
          className={POPOVER_CLASS}
          style={{ background: "var(--card)", border: "1px solid var(--line)" }}
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
            className="font-sans flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--ink)] data-[highlighted]:bg-[var(--cream-2)]"
          >
            <Eye className="size-4 text-[var(--ink-3)]" />
            Include in synthesis
            <Check className="ml-auto size-3.5 text-[var(--clay)]" />
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
          className="font-sans flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--ink)] data-[highlighted]:bg-[var(--cream-2)]"
        >
          <EyeSlash className="size-4 text-[var(--ink-3)]" />
          Exclude from synthesis…
        </RadixDropdownMenu.Item>
      </RadixAlertDialog.Trigger>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay
          className={cn(
            "drawer-backdrop",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        />
        <RadixAlertDialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
          style={{
            background: "var(--card)",
            borderRadius: 8,
            border: "1px solid var(--line)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <RadixAlertDialog.Title
            className="font-serif"
            style={{ fontSize: 22, fontWeight: 400, margin: 0 }}
          >
            Exclude from synthesis?
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="font-sans mt-2 text-sm leading-6 text-[var(--ink-2)]">
            This respondent will be hidden from project-level themes and
            recommendations. The transcript and analysis stay intact and you can
            include them again later.
          </RadixAlertDialog.Description>
          <form
            action={toggleSessionExclusionAction}
            className="mt-6 flex justify-end gap-2"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="excluded" value="true" />
            <RadixAlertDialog.Cancel asChild>
              <Button type="button" variant="ghost" size="sm">
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
