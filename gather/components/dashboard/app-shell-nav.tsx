"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const navItems = [
  { href: "/app", label: "Overview", match: (path: string) => path === "/app" },
  {
    href: "/app/projects",
    label: "Projects",
    match: (path: string) => path.startsWith("/app/projects"),
  },
]

export function AppShellNav() {
  const pathname = usePathname()

  return (
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
  )
}
