import Link from "next/link"
import { notFound } from "next/navigation"

import { getPublicTestimonialEmbed } from "@/lib/data/repository"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | string[] | undefined>

interface EmbedPageProps {
  params: Promise<{
    projectId: string
  }>
  searchParams?: Promise<SearchParams> | SearchParams
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseColumns(value: string | string[] | undefined) {
  const columns = Number.parseInt(firstParam(value) ?? "2", 10)
  return columns === 1 || columns === 2 || columns === 3 ? columns : 2
}

function parseLimit(value: string | string[] | undefined) {
  const limit = Number.parseInt(firstParam(value) ?? "20", 10)
  return Number.isFinite(limit) ? Math.max(1, Math.min(20, limit)) : 20
}

function parseTheme(value: string | string[] | undefined) {
  return firstParam(value) === "dark" ? "dark" : "light"
}

const STICKY_TINTS = ["cream", "peach", "sage", "lilac"] as const

export default async function TestimonialEmbedPage({
  params,
  searchParams,
}: EmbedPageProps) {
  const { projectId } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const columns = parseColumns(resolvedSearchParams.columns)
  const limit = parseLimit(resolvedSearchParams.limit)
  const theme = parseTheme(resolvedSearchParams.theme)
  const embed = await getPublicTestimonialEmbed(projectId, limit)

  if (!embed) {
    notFound()
  }

  const reviewUrl = `/t/${embed.link.linkToken}`
  const signUpUrl = "/sign-in?intent=testimonials"
  const isDark = theme === "dark"

  return (
    <main
      className="min-h-screen p-6"
      style={{
        background: isDark ? "#1f1a13" : "var(--cream)",
        color: isDark ? "#f5ecd9" : "var(--ink)",
        fontFamily: "var(--font-serif), Georgia, serif",
      }}
    >
      <section className="mx-auto flex max-w-6xl flex-col gap-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span
              className="font-mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                opacity: 0.65,
              }}
            >
              In their words
            </span>
            <h1
              className="font-serif"
              style={{
                fontSize: 32,
                fontWeight: 400,
                letterSpacing: "-0.012em",
                margin: "6px 0 0",
                lineHeight: 1.1,
              }}
            >
              What people say about{" "}
              <span style={{ fontStyle: "italic", color: embed.link.brandColor }}>
                {embed.link.businessName}
              </span>
            </h1>
          </div>
          {embed.captureEnabled ? (
            <Link
              href={reviewUrl}
              target="_blank"
              className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white"
              style={{
                backgroundColor: embed.link.brandColor,
                fontFamily: "var(--font-sans), sans-serif",
                boxShadow: "0 2px 0 rgba(0,0,0,0.15)",
              }}
            >
              Leave a review →
            </Link>
          ) : null}
        </div>

        {embed.reviews.length === 0 ? (
          <div
            className="font-serif"
            style={{
              border: `1.5px dashed ${isDark ? "#4a4032" : "var(--line)"}`,
              borderRadius: 8,
              padding: "20px 24px",
              fontSize: 16,
              lineHeight: 1.5,
              opacity: 0.7,
            }}
          >
            Approved reviews will appear here soon.
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-5",
              columns === 1
                ? "grid-cols-1"
                : columns === 2
                  ? "md:grid-cols-2"
                  : "md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {embed.reviews.map((review, i) => {
              const tint = STICKY_TINTS[i % STICKY_TINTS.length]
              const rotate = (i % 2 === 0 ? -1 : 1) * (1 + (i % 3) * 0.4)
              return (
                <article
                  key={review.id}
                  className={`sticky ${tint}`}
                  style={{
                    transform: `rotate(${rotate}deg)`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      letterSpacing: "0.06em",
                      color: "#c89b3a",
                    }}
                  >
                    {"★".repeat(review.rating)}
                    <span style={{ opacity: 0.25 }}>
                      {"★".repeat(5 - review.rating)}
                    </span>
                  </div>
                  <blockquote
                    className="font-serif"
                    style={{
                      margin: "12px 0 0",
                      fontSize: 17,
                      lineHeight: 1.5,
                      color: "#2a2319",
                    }}
                  >
                    &ldquo;{review.transcript}&rdquo;
                  </blockquote>
                  {review.reviewerName ? (
                    <p
                      className="font-mono"
                      style={{
                        marginTop: 14,
                        marginBottom: 0,
                        fontSize: 11,
                        letterSpacing: "0.14em",
                        color: "#5c4e3a",
                      }}
                    >
                      — {review.reviewerName}
                    </p>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        <footer
          className="font-mono"
          style={{
            fontSize: 11,
            opacity: 0.6,
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Link href={signUpUrl} target="_blank">
            Powered by gather.
          </Link>
          <span>·</span>
          <Link href={signUpUrl} target="_blank">
            Get voice reviews
          </Link>
        </footer>
      </section>
    </main>
  )
}
