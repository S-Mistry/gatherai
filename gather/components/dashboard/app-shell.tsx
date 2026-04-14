"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChartLine, House, MicrophoneStage, SignIn } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/app", label: "Overview", icon: House },
  { href: "/app/projects", label: "Projects", icon: ChartLine },
  { href: "/sign-in", label: "Auth", icon: SignIn },
]

interface AppShellProps {
  children: React.ReactNode
  userEmail?: string | null
  demoMode: boolean
}

export function AppShell({
  children,
  userEmail,
  demoMode,
}: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="page-gradient min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:px-8">
        <aside className="panel flex w-full shrink-0 flex-col gap-6 lg:w-80">
          <div className="space-y-3">
            <Badge variant="accent" className="gap-2">
              <MicrophoneStage className="size-4" />
              GatherAI
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold text-balance">
                AI workshop discovery control room
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Voice-first stakeholder discovery with transcript-backed synthesis.
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active =
                pathname === item.href ||
                (item.href !== "/app" && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition",
                    active
                      ? "border-primary/20 bg-primary/12 text-primary"
                      : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-card/80 hover:text-foreground"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4" />
                    {item.label}
                  </span>
                  {active ? <span className="size-2 rounded-full bg-primary" /> : null}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3 rounded-2xl border border-border/70 bg-background/75 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Environment</p>
              <Badge variant={demoMode ? "warning" : "success"}>
                {demoMode ? "Demo mode" : "Live mode"}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {demoMode
                ? "Supabase and OpenAI are not configured yet, so the app is running on mock data and scaffolded routes."
                : `Signed in as ${userEmail ?? "consultant"}.`}
            </p>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
