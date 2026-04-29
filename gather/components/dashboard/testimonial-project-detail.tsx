import Link from "next/link"
import { Globe, Star } from "@phosphor-icons/react/dist/ssr"

import { createTestimonialLinkAction } from "@/app/app/actions"
import { TestimonialEmbedBuilder } from "@/components/dashboard/testimonial-embed-builder"
import { TestimonialReviewActions } from "@/components/dashboard/testimonial-review-actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyLink } from "@/components/ui/copy-link"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tape } from "@/components/ui/ornaments"
import { RelativeTime } from "@/components/ui/relative-time"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type {
  ProjectConfigVersion,
  ProjectRecord,
  TestimonialLink,
  TestimonialReview,
  TestimonialReviewStatus,
} from "@/lib/domain/types"
import { cn } from "@/lib/utils"

type ReviewFilter = "all" | TestimonialReviewStatus

interface TestimonialProjectDetailProps {
  project: ProjectRecord
  configVersion: ProjectConfigVersion
  testimonialLinks: TestimonialLink[]
  testimonialReviews: TestimonialReview[]
  origin: string
  activeFilter: ReviewFilter
}

const reviewFilters: Array<{ key: ReviewFilter; label: string }> = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
]

export function TestimonialProjectDetail({
  project,
  configVersion,
  testimonialLinks,
  testimonialReviews,
  origin,
  activeFilter,
}: TestimonialProjectDetailProps) {
  const activeLink = testimonialLinks[0]
  const approvedCount = testimonialReviews.filter(
    (review) => review.status === "approved"
  ).length
  const pendingCount = testimonialReviews.filter(
    (review) => review.status === "pending"
  ).length
  const filteredReviews =
    activeFilter === "all"
      ? testimonialReviews
      : testimonialReviews.filter((review) => review.status === activeFilter)
  const embedBaseUrl = `${origin}/embed/testimonials/${project.id}`

  return (
    <div className="space-y-14">
      {/* Hero */}
      <section className="card flat relative" style={{ padding: "38px 42px" }}>
        <Tape
          tint="green"
          style={{
            top: -11,
            left: "50%",
            transform: "translateX(-50%) rotate(-2deg)",
          }}
        />
        <div className="font-hand text-[26px] text-[var(--sage)]">
          ✶ testimonial collection —
        </div>
        <h1
          className="font-serif"
          style={{
            fontSize: 52,
            fontWeight: 400,
            lineHeight: 1.05,
            margin: "10px 0 18px",
            letterSpacing: "-0.018em",
          }}
        >
          {project.name}
        </h1>
        <p
          className="font-sans"
          style={{
            fontSize: 15,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            maxWidth: 620,
            margin: 0,
          }}
        >
          {configVersion.objective}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3.5">
          <Badge variant="sage" dot>
            {approvedCount} approved
          </Badge>
          <Badge variant="gold">{pendingCount} pending</Badge>
          <span className="font-mono text-[11px] text-[var(--ink-3)]">
            {testimonialReviews.length} total
          </span>
        </div>
      </section>

      <Tabs defaultValue="reviews" className="gap-7">
        <TabsList aria-label="Testimonial project sections">
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
        </TabsList>

        <TabsContent value="reviews" className="space-y-14">
          {/* Review links */}
          <section className="space-y-5">
            <div className="flex flex-wrap items-baseline gap-3.5">
              <h2
                className="font-serif"
                style={{ fontSize: 28, fontWeight: 400, margin: 0 }}
              >
                Review links
              </h2>
              <span
                className="font-hand"
                style={{ fontSize: 18, color: "var(--ink-3)" }}
              >
                — {testimonialLinks.length}{" "}
                {testimonialLinks.length === 1 ? "link" : "links"}
              </span>
            </div>

            {testimonialLinks.length === 0 ? (
              <p
                className="font-sans"
                style={{
                  border: "1.5px dashed var(--line)",
                  borderRadius: 8,
                  padding: "18px 20px",
                  fontSize: 14,
                  color: "var(--ink-3)",
                }}
              >
                No testimonial links have been created for this project yet.
              </p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {testimonialLinks.map((link) => {
                  const reviewUrl = `${origin}/t/${link.linkToken}`
                  return (
                    <article
                      key={link.id}
                      className="card flat"
                      style={{ padding: "22px 24px" }}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="sage">{link.businessName}</Badge>
                            <span className="inline-flex items-center gap-1 font-sans text-xs text-[var(--ink-3)]">
                              <Globe className="size-3" />
                              {new URL(link.websiteUrl).hostname}
                            </span>
                          </div>
                          <h3
                            className="mt-2 font-serif"
                            style={{
                              fontSize: 22,
                              fontWeight: 400,
                              margin: "8px 0 6px",
                            }}
                          >
                            {link.headline}
                          </h3>
                          <p
                            className="font-sans"
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.55,
                              color: "var(--ink-2)",
                              margin: 0,
                            }}
                          >
                            {link.prompt} Takes 10 seconds.
                          </p>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/t/${link.linkToken}`}>Preview →</Link>
                        </Button>
                      </div>
                      <CopyLink
                        value={reviewUrl}
                        label="Copy"
                        className="mt-4"
                      />
                    </article>
                  )
                })}
              </div>
            )}

            <details
              style={{
                border: "1px dashed var(--line)",
                borderRadius: 8,
                padding: "18px 22px",
              }}
            >
              <summary
                className="cursor-pointer font-hand"
                style={{
                  fontSize: 22,
                  color: "var(--clay)",
                  listStyle: "none",
                }}
              >
                + create another review link
              </summary>
              <form
                action={createTestimonialLinkAction}
                className="mt-5 grid gap-6 md:grid-cols-2"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <Field label="business name" htmlFor="businessName">
                  <Input
                    id="businessName"
                    name="businessName"
                    required
                    defaultValue={activeLink?.businessName ?? project.name}
                  />
                </Field>
                <Field label="website URL" htmlFor="websiteUrl">
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    required
                    defaultValue={activeLink?.websiteUrl ?? ""}
                    placeholder="https://example.com"
                  />
                </Field>
                <Field label="brand colour" htmlFor="brandColor">
                  <input
                    id="brandColor"
                    name="brandColor"
                    type="color"
                    defaultValue={activeLink?.brandColor ?? "#b45f3a"}
                    className="h-10 w-full rounded-md border border-[var(--line)] bg-transparent"
                  />
                </Field>
                <Field label="headline" htmlFor="headline">
                  <Input
                    id="headline"
                    name="headline"
                    defaultValue={activeLink?.headline ?? "Leave a review"}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="prompt" htmlFor="prompt">
                    <Textarea
                      id="prompt"
                      name="prompt"
                      rows={3}
                      defaultValue={
                        activeLink?.prompt ?? "Tell us about your experience."
                      }
                    />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" variant="clay" size="sm">
                    Create review link
                  </Button>
                </div>
              </form>
            </details>
          </section>

          {/* Reviews */}
          <section className="space-y-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between">
              <div className="flex flex-wrap items-baseline gap-3.5">
                <h2
                  className="font-serif"
                  style={{ fontSize: 28, fontWeight: 400, margin: 0 }}
                >
                  In their words
                </h2>
                <span
                  className="font-hand"
                  style={{ fontSize: 18, color: "var(--ink-3)" }}
                >
                  — approve the ones you want on your site
                </span>
              </div>
              <ReviewFilterChips
                projectId={project.id}
                activeFilter={activeFilter}
              />
            </div>

            <ReviewsList projectId={project.id} reviews={filteredReviews} />
          </section>
        </TabsContent>

        <TabsContent value="embed">
          {activeLink ? (
            <TestimonialEmbedBuilder
              embedBaseUrl={embedBaseUrl}
              approvedCount={approvedCount}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReviewFilterChips({
  projectId,
  activeFilter,
}: {
  projectId: string
  activeFilter: ReviewFilter
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter testimonial reviews"
      className="flex flex-wrap items-center gap-2"
    >
      {reviewFilters.map((filter) => {
        const isActive = filter.key === activeFilter
        return (
          <Link
            key={filter.key}
            href={`/app/projects/${projectId}?reviewFilter=${filter.key}`}
            role="tab"
            aria-selected={isActive}
            className={cn("chip", isActive && "clay")}
          >
            {filter.label}
          </Link>
        )
      })}
    </div>
  )
}

function ReviewsList({
  projectId,
  reviews,
}: {
  projectId: string
  reviews: TestimonialReview[]
}) {
  if (reviews.length === 0) {
    return (
      <p
        className="font-sans"
        style={{
          border: "1.5px dashed var(--line)",
          borderRadius: 8,
          padding: "18px 20px",
          fontSize: 14,
          color: "var(--ink-3)",
          textAlign: "center",
        }}
      >
        No reviews match this filter yet.
      </p>
    )
  }

  return (
    <div className="grid gap-3.5">
      {reviews.map((review) => (
        <article
          key={review.id}
          className="card flat"
          style={{ padding: "20px 22px" }}
        >
          <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StarDisplay rating={review.rating} />
                <Badge
                  variant={
                    review.status === "approved"
                      ? "sage"
                      : review.status === "rejected"
                        ? "rose"
                        : "gold"
                  }
                >
                  {review.status}
                </Badge>
                <span className="font-mono text-[11px] text-[var(--ink-3)]">
                  <RelativeTime date={review.createdAt} />
                </span>
              </div>
              <blockquote
                className="mt-3 font-serif"
                style={{
                  fontSize: 18,
                  lineHeight: 1.5,
                  color: "var(--ink)",
                  margin: 0,
                }}
              >
                &ldquo;{review.transcript}&rdquo;
              </blockquote>
              <p className="mt-3 font-sans text-xs font-medium text-[var(--ink-3)]">
                {review.reviewerName || "Name not provided"}
              </p>
            </div>
            <TestimonialReviewActions
              projectId={projectId}
              reviewId={review.id}
              currentStatus={review.status}
            />
          </div>
        </article>
      ))}
    </div>
  )
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[var(--gold)]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={cn(
            "size-4",
            index < rating ? "fill-current" : "opacity-25"
          )}
          weight={index < rating ? "fill" : "regular"}
        />
      ))}
    </span>
  )
}
