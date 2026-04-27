import Link from "next/link"
import { Fragment } from "react"

import { cn } from "@/lib/utils"

export interface CrumbItem {
  label: string
  href?: string
}

export function Crumb({
  items,
  className,
}: {
  items: CrumbItem[]
  className?: string
}) {
  return (
    <nav className={cn("crumb", className)} aria-label="Breadcrumb">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <Fragment key={`${item.label}-${i}`}>
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span className={last ? "here" : undefined}>{item.label}</span>
            )}
            {!last && <span className="sep">/</span>}
          </Fragment>
        )
      })}
    </nav>
  )
}
