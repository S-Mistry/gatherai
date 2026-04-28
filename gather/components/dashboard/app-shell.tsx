import type { ReactNode } from "react"

import { signOutAction } from "@/app/app/actions"
import { AppBar, AppBarAvatar } from "@/components/ui/app-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CrumbItem } from "@/components/ui/crumb"

interface AppShellProps {
  children: ReactNode
  userEmail?: string | null
  demoMode: boolean
  crumb?: CrumbItem[]
  rightSlot?: ReactNode
}

function initialsFor(email: string | null | undefined) {
  if (!email) return "GA"
  const handle = email.split("@")[0] ?? ""
  const parts = handle.split(/[._-]/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return handle.slice(0, 2).toUpperCase() || "GA"
}

export function AppShell({
  children,
  userEmail,
  demoMode,
  crumb,
  rightSlot,
}: AppShellProps) {
  const right = (
    <>
      {rightSlot}
      {demoMode ? (
        <Badge variant="gold">Demo</Badge>
      ) : userEmail ? (
        <span className="font-sans hidden max-w-[14rem] truncate text-xs text-[var(--ink-3)] sm:inline">
          {userEmail}
        </span>
      ) : null}
      {!demoMode ? (
        <form action={signOutAction}>
          <Button variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      ) : null}
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <AppBar
        crumb={crumb ?? [{ label: "Workspace" }]}
        right={right}
        avatar={<AppBarAvatar initials={initialsFor(userEmail)} />}
      />
      {children}
    </div>
  )
}
