"use client"

import { useMemo, useState } from "react"
import { Check, Copy } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const COLUMN_OPTIONS = [1, 2, 3] as const
const LIMIT_OPTIONS = [3, 5, 10, 15, 20] as const
const HEIGHT_OPTIONS = [300, 400, 500, 600, 800] as const

interface TestimonialEmbedBuilderProps {
  embedBaseUrl: string
  approvedCount: number
}

export function TestimonialEmbedBuilder({
  embedBaseUrl,
  approvedCount,
}: TestimonialEmbedBuilderProps) {
  const [columns, setColumns] = useState<(typeof COLUMN_OPTIONS)[number]>(2)
  const [limit, setLimit] = useState<(typeof LIMIT_OPTIONS)[number]>(10)
  const [height, setHeight] = useState<(typeof HEIGHT_OPTIONS)[number]>(500)
  const [theme, setTheme] = useState<"light" | "dark">("light")
  const [copied, setCopied] = useState(false)

  const src = useMemo(() => {
    const url = new URL(embedBaseUrl)
    url.searchParams.set("columns", String(columns))
    url.searchParams.set("limit", String(limit))
    url.searchParams.set("theme", theme)
    return url.toString()
  }, [columns, embedBaseUrl, limit, theme])

  const code = `<iframe src="${src}" width="100%" height="${height}" frameborder="0" style="border:0;border-radius:8px;max-width:100%;" loading="lazy"></iframe>`
  const previewSrc = useMemo(() => {
    const url = new URL(src)
    url.searchParams.set("previewVersion", String(approvedCount))
    return url.toString()
  }, [approvedCount, src])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be unavailable in some browser contexts.
    }
  }

  return (
    <section className="card flat" style={{ padding: "26px 28px" }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="eyebrow">Embed</span>
          <h2
            className="font-serif mt-2"
            style={{ fontSize: 24, fontWeight: 400, margin: "8px 0 6px" }}
          >
            Website widget
          </h2>
          <p className="font-sans text-sm leading-6 text-[var(--ink-2)] m-0">
            Approved reviews only. Currently {approvedCount} approved.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={copyCode}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mt-5">
        <OptionGroup
          label="columns"
          value={columns}
          options={COLUMN_OPTIONS}
          onChange={setColumns}
        />
        <OptionGroup
          label="limit"
          value={limit}
          options={LIMIT_OPTIONS}
          onChange={setLimit}
        />
        <OptionGroup
          label="height"
          value={height}
          options={HEIGHT_OPTIONS}
          onChange={setHeight}
          suffix="px"
        />
        <div>
          <span
            className="font-hand block mb-2"
            style={{ fontSize: 22, color: "var(--clay)" }}
          >
            theme
          </span>
          <div
            className="flex"
            style={{
              border: "1px solid var(--line)",
              borderRadius: 999,
              padding: 4,
              background: "var(--card)",
            }}
          >
            {(["light", "dark"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                className={cn(
                  "flex-1 font-sans text-xs font-medium px-3 py-1.5 rounded-full transition-colors",
                  theme === option
                    ? "bg-[var(--clay-soft)] text-[var(--clay)]"
                    : "text-[var(--ink-3)] hover:text-[var(--ink)]"
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <textarea
        readOnly
        value={code}
        className="font-mono mt-5 min-h-24 w-full resize-none px-4 py-3 text-xs leading-5 text-[var(--ink)] outline-none"
        style={{
          background: "var(--card-2)",
          border: "1px solid var(--line)",
          borderRadius: 6,
        }}
        onFocus={(event) => event.currentTarget.select()}
      />

      <div
        className="mt-5 overflow-hidden"
        style={{
          border: "1px solid var(--line)",
          borderRadius: 8,
          background: "var(--card)",
        }}
      >
        <iframe
          key={previewSrc}
          title="Testimonial embed preview"
          src={previewSrc}
          height={height}
          className="block w-full"
        />
      </div>
    </section>
  )
}

function OptionGroup<T extends number>({
  label,
  value,
  options,
  suffix = "",
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  suffix?: string
  onChange: (value: T) => void
}) {
  return (
    <div>
      <span
        className="font-hand block mb-2"
        style={{ fontSize: 22, color: "var(--clay)" }}
      >
        {label}
      </span>
      <div
        className="flex flex-wrap gap-1"
        style={{
          border: "1px solid var(--line)",
          borderRadius: 999,
          padding: 4,
          background: "var(--card)",
        }}
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "font-sans px-2.5 py-1.5 text-xs font-semibold rounded-full transition-colors",
              value === option
                ? "bg-[var(--clay-soft)] text-[var(--clay)]"
                : "text-[var(--ink-3)] hover:text-[var(--ink)]"
            )}
          >
            {option}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  )
}
