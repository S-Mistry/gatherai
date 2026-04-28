"use client"

import { Tabs as RadixTabs } from "radix-ui"
import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

export function Tabs({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Root>) {
  return (
    <RadixTabs.Root
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

export function TabsList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.List>) {
  return (
    <RadixTabs.List
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-full p-1.5",
        className
      )}
      style={{
        background: "var(--card)",
        border: "1px solid var(--line)",
      }}
      {...props}
    />
  )
}

export function TabsTrigger({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "font-sans inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-[var(--ink-3)] transition-colors",
        "hover:text-[var(--ink)]",
        "data-[state=active]:bg-[var(--clay-soft)] data-[state=active]:text-[var(--clay)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clay)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--cream)]",
        className
      )}
      {...props}
    />
  )
}

export function TabsContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixTabs.Content>) {
  return (
    <RadixTabs.Content
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  )
}
