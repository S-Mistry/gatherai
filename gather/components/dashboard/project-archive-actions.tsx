"use client"

import { useFormStatus } from "react-dom"
import { AlertDialog as RadixAlertDialog } from "radix-ui"
import { ArrowCounterClockwise, X } from "@phosphor-icons/react"

import {
  archiveProjectAction,
  permanentlyDeleteArchivedProjectAction,
  permanentlyDeleteArchivedProjectsAction,
  restoreArchivedProjectAction,
} from "@/app/app/actions"
import { Button } from "@/components/ui/button"

type ProjectArchiveActionMode = "active" | "archived"

interface ProjectTileArchiveActionsProps {
  projectId: string
  projectName: string
  mode: ProjectArchiveActionMode
  liveSessionCount: number
}

export function ProjectTileArchiveActions({
  projectId,
  projectName,
  mode,
  liveSessionCount,
}: ProjectTileArchiveActionsProps) {
  const isArchived = mode === "archived"
  const action = isArchived
    ? permanentlyDeleteArchivedProjectAction
    : archiveProjectAction
  const title = isArchived ? "Permanently delete project?" : "Archive project?"
  const confirmLabel = isArchived ? "Delete forever" : "Archive"
  const ariaLabel = isArchived
    ? `Permanently delete ${projectName}`
    : `Archive ${projectName}`
  const description = isArchived
    ? `${projectName} will be permanently removed, including responses, transcripts, generated outputs, testimonial reviews, and links. This cannot be undone.`
    : liveSessionCount > 0
      ? `${projectName} has ${liveSessionCount} live ${liveSessionCount === 1 ? "session" : "sessions"}. Archiving will hide the project and stop public capture links immediately, so active respondents may be interrupted. You can restore it from the archive.`
      : `${projectName} will move to the archive and public capture links will stop working until you restore it. Testimonial embeds keep showing approved reviews.`

  return (
    <>
      <RadixAlertDialog.Root>
        <RadixAlertDialog.Trigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="project-tile-x"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </RadixAlertDialog.Trigger>
        <RadixAlertDialog.Portal>
          <RadixAlertDialog.Overlay className="drawer-backdrop data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
          <RadixAlertDialog.Content
            className="fixed top-1/2 left-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in"
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              boxShadow: "var(--shadow-pop)",
            }}
          >
            <RadixAlertDialog.Title
              className="font-serif"
              style={{ fontSize: 22, fontWeight: 400, margin: 0 }}
            >
              {title}
            </RadixAlertDialog.Title>
            <RadixAlertDialog.Description className="mt-2 font-sans text-sm leading-6 text-[var(--ink-2)]">
              {description}
            </RadixAlertDialog.Description>
            <form action={action} className="mt-6 flex justify-end gap-2">
              <input type="hidden" name="projectId" value={projectId} />
              <RadixAlertDialog.Cancel asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </RadixAlertDialog.Cancel>
              <RadixAlertDialog.Action asChild>
                <SubmitButton
                  label={confirmLabel}
                  pendingLabel={isArchived ? "Deleting..." : "Archiving..."}
                  destructive={isArchived}
                />
              </RadixAlertDialog.Action>
            </form>
          </RadixAlertDialog.Content>
        </RadixAlertDialog.Portal>
      </RadixAlertDialog.Root>

      {isArchived ? (
        <form
          action={restoreArchivedProjectAction}
          className="project-tile-restore"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <RestoreButton />
        </form>
      ) : null}
    </>
  )
}

export function DeleteArchivedProjectsButton({ count }: { count: number }) {
  if (count === 0) {
    return null
  }

  return (
    <RadixAlertDialog.Root>
      <RadixAlertDialog.Trigger asChild>
        <Button type="button" variant="destructive" size="sm">
          Delete all archived
        </Button>
      </RadixAlertDialog.Trigger>
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="drawer-backdrop data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in" />
        <RadixAlertDialog.Content
          className="fixed top-1/2 left-1/2 z-[101] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in"
          style={{
            background: "var(--card)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "var(--shadow-pop)",
          }}
        >
          <RadixAlertDialog.Title
            className="font-serif"
            style={{ fontSize: 22, fontWeight: 400, margin: 0 }}
          >
            Delete all archived projects?
          </RadixAlertDialog.Title>
          <RadixAlertDialog.Description className="mt-2 font-sans text-sm leading-6 text-[var(--ink-2)]">
            This permanently removes {count} archived{" "}
            {count === 1 ? "project" : "projects"}, including responses,
            transcripts, generated outputs, testimonial reviews, and links. This
            cannot be undone.
          </RadixAlertDialog.Description>
          <form
            action={permanentlyDeleteArchivedProjectsAction}
            className="mt-6 flex justify-end gap-2"
          >
            <RadixAlertDialog.Cancel asChild>
              <Button type="button" variant="ghost" size="sm">
                Cancel
              </Button>
            </RadixAlertDialog.Cancel>
            <RadixAlertDialog.Action asChild>
              <SubmitButton
                label="Delete all"
                pendingLabel="Deleting..."
                destructive
              />
            </RadixAlertDialog.Action>
          </form>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  )
}

function SubmitButton({
  label,
  pendingLabel,
  destructive = false,
}: {
  label: string
  pendingLabel: string
  destructive?: boolean
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={destructive ? "destructive" : "clay"}
      size="sm"
      disabled={pending}
    >
      {pending ? pendingLabel : label}
    </Button>
  )
}

function RestoreButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="project-tile-restore-button"
      title="Restore project"
      aria-label="Restore project"
    >
      <ArrowCounterClockwise className="size-3.5" aria-hidden="true" />
      <span>{pending ? "Restoring..." : "restore"}</span>
    </button>
  )
}
