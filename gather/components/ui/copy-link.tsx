"use client"

import { useState } from "react"
import { Check, Copy } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface CopyLinkProps {
  value: string
  label?: string
  className?: string
}

export function CopyLink({ value, label = "Copy", className }: CopyLinkProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — swallow
    }
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border/70 bg-background/70 p-1 pl-3",
        className
      )}
    >
      <input
        readOnly
        value={value}
        aria-label="Shareable link"
        className="flex-1 bg-transparent text-sm text-foreground outline-none"
        onFocus={(event) => event.currentTarget.select()}
      />
      <Button size="sm" variant="outline" onClick={handleCopy} aria-live="polite">
        {copied ? (
          <>
            <Check className="size-4" /> Copied
          </>
        ) : (
          <>
            <Copy className="size-4" /> {label}
          </>
        )}
      </Button>
    </div>
  )
}
