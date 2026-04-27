"use client"

import { useEffect, type ReactNode } from "react"

import { Button } from "./button"

export function EvidenceDrawer({
  open,
  kind,
  onClose,
  children,
}: {
  open: boolean
  kind: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={`Evidence: ${kind}`}>
        <header
          className="flex items-center justify-between"
          style={{
            padding: "24px 28px",
            borderBottom: "1px dashed var(--line)",
          }}
        >
          <span className="eyebrow">Evidence · {kind}</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            close ✕
          </Button>
        </header>
        <div style={{ padding: "28px 32px" }}>{children}</div>
      </aside>
    </>
  )
}
