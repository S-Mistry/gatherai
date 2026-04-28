import type { ReactNode } from "react"

import { Crumb, type CrumbItem } from "./crumb"
import { Wordmark } from "./wordmark"

export function AppBar({
  crumb,
  right,
  avatar,
}: {
  crumb?: CrumbItem[]
  right?: ReactNode
  avatar?: ReactNode
}) {
  return (
    <div className="app-bar">
      <div className="flex min-w-0 flex-1 items-center gap-7">
        <Wordmark />
        {crumb && <Crumb items={crumb} />}
      </div>
      <div className="flex shrink-0 items-center gap-3.5">
        {right}
        {avatar}
      </div>
    </div>
  )
}

export function AppBarAvatar({
  initials,
  tint = "clay",
}: {
  initials: string
  tint?: "clay" | "sage" | "ink"
}) {
  const bg =
    tint === "sage" ? "var(--sage)" : tint === "ink" ? "var(--ink)" : "var(--clay)"
  return (
    <div
      className="font-sans"
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: bg,
        color: "var(--card)",
        display: "grid",
        placeItems: "center",
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {initials}
    </div>
  )
}
