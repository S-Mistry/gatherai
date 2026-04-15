import Link from "next/link"
import { CaretRight } from "@phosphor-icons/react/dist/ssr"

import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex flex-wrap items-center gap-1 text-xs text-muted-foreground", className)}
    >
      {items.map((item, index) => {
        const last = index === items.length - 1
        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="rounded-md px-1 py-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={last ? "page" : undefined}
                className={cn("px-1 py-0.5", last && "text-foreground")}
              >
                {item.label}
              </span>
            )}
            {!last ? <CaretRight className="size-3 text-muted-foreground/60" /> : null}
          </span>
        )
      })}
    </nav>
  )
}
