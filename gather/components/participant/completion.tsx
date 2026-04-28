import type { ReactNode } from "react"

import { Stamp, StickyNote } from "@/components/ui/ornaments"

function ordinal(n: number): string {
  const abs = Math.abs(n)
  const lastTwo = abs % 100
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`
  switch (abs % 10) {
    case 1:
      return `${n}st`
    case 2:
      return `${n}nd`
    case 3:
      return `${n}rd`
    default:
      return `${n}th`
  }
}

interface CompletionProps {
  /** Headline. Default: "Thanks — that helps." */
  headline?: string
  /** Caveat clay accent under the headline. Default: "— really." */
  caveatAccent?: string
  /** Body paragraph in serif 22 ink-2. */
  body: string
  /** Optional total response count (renders the dot grid). */
  total?: number
  /** Index of the latest response (1-based) — highlighted sage in the grid. */
  latest?: number
  /** Optional sticky-note copy. Pass two lines via children for the manual break. */
  stickyNote?: ReactNode
  /** Override the stamp text. Default uses ordinal of `latest`. */
  stampLabel?: string
  /** Final small-print under the body. Default: "That's it. You can close this tab." */
  smallPrint?: string
}

export function Completion({
  headline = "Thanks — that helps.",
  caveatAccent = "— really.",
  body,
  total = 0,
  latest = 0,
  stickyNote,
  stampLabel,
  smallPrint = "That's it. You can close this tab.",
}: CompletionProps) {
  const dotCount = Math.max(total, latest, 0)
  const stampText =
    stampLabel ?? (latest > 0 ? `received · ${ordinal(latest)} voice` : "received · thank you")

  return (
    <div className="grid place-items-center" style={{ minHeight: "100vh", padding: "80px 24px" }}>
      <div
        className="text-center"
        style={{ maxWidth: 640, width: "100%", position: "relative" }}
      >
        <div style={{ marginBottom: 36 }}>
          <Stamp variant="sage">{stampText}</Stamp>
        </div>

        <h1
          className="font-serif"
          style={{
            fontSize: 78,
            fontWeight: 400,
            lineHeight: 1.0,
            margin: "0 0 28px",
            letterSpacing: "-0.02em",
          }}
        >
          {headline}
        </h1>

        {caveatAccent ? (
          <div
            className="font-hand inline-block"
            style={{
              fontSize: 30,
              color: "var(--clay)",
              marginBottom: 32,
              transform: "rotate(-1deg)",
            }}
          >
            {caveatAccent}
          </div>
        ) : null}

        <p
          className="font-serif"
          style={{
            fontSize: 22,
            lineHeight: 1.5,
            color: "var(--ink-2)",
            margin: "0 auto 40px",
            maxWidth: 480,
          }}
        >
          {body}
        </p>

        {dotCount > 0 ? (
          <div
            className="flex flex-wrap justify-center"
            style={{
              gap: 6,
              maxWidth: 320,
              margin: "0 auto 44px",
            }}
            aria-hidden
          >
            {Array.from({ length: Math.max(dotCount, 24) }).map((_, i) => {
              const isLatest = i === latest - 1
              return (
                <span
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: isLatest ? "var(--sage)" : "var(--ink-4)",
                    boxShadow: isLatest ? "0 0 0 4px var(--sage-soft)" : "none",
                  }}
                />
              )
            })}
          </div>
        ) : null}

        {smallPrint ? (
          <div
            className="font-sans"
            style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}
          >
            {smallPrint}
          </div>
        ) : null}

        {stickyNote ? (
          <div
            className="inline-block"
            style={{ transform: "rotate(-2deg)", marginTop: 16 }}
          >
            <StickyNote
              tint="sage"
              className="text-left"
              style={{ maxWidth: 320, padding: "20px 22px" }}
            >
              <div
                className="font-hand"
                style={{ fontSize: 20, color: "var(--ink)", lineHeight: 1.3 }}
              >
                {stickyNote}
              </div>
            </StickyNote>
          </div>
        ) : null}
      </div>
    </div>
  )
}
