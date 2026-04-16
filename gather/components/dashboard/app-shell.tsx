"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MicrophoneStage } from "@phosphor-icons/react/dist/ssr"

import { signOutAction } from "@/app/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/app", label: "Overview", match: (p: string) => p === "/app" },
  {
    href: "/app/projects",
    label: "Projects",
    match: (p: string) => p.startsWith("/app/projects"),
  },
]

interface AppShellProps {
  children: React.ReactNode
  userEmail?: string | null
  demoMode: boolean
}

export function AppShell({ children, userEmail, demoMode }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="page-gradient flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link
            href="/app"
            className="focus-ring flex items-center gap-2 rounded-md"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/12 text-primary">
              <MicrophoneStage className="size-3.5" weight="fill" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              GatherAI
            </span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Primary">
            {navItems.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "focus-ring relative rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                  {active ? (
                    <span className="absolute inset-x-2.5 -bottom-[11px] h-0.5 rounded-full bg-primary" />
                  ) : null}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {demoMode ? (
              <Badge variant="warning">Demo</Badge>
            ) : userEmail ? (
              <span className="hidden max-w-[14rem] truncate text-xs text-muted-foreground sm:inline">
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
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
