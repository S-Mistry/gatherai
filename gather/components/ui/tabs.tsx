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
        "flex flex-wrap items-center gap-1 rounded-2xl border border-border/70 bg-background/70 p-1 backdrop-blur",
        className
      )}
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
        "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors",
        "hover:text-foreground",
        "data-[state=active]:bg-primary/12 data-[state=active]:text-primary",
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40",
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
      className={cn(
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 rounded-2xl",
        className
      )}
      {...props}
    />
  )
}
