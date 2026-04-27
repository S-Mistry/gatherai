import Link from "next/link"

import { cn } from "@/lib/utils"

export function Wordmark({
  href = "/",
  className,
}: {
  href?: string
  className?: string
}) {
  return (
    <Link href={href} className={cn("wordmark", className)} aria-label="gather">
      gather
      <span className="dot">.</span>
    </Link>
  )
}
