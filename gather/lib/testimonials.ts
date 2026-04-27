import type { TestimonialReviewStatus } from "@/lib/domain/types"

export const DEFAULT_TESTIMONIAL_HEADLINE = "Leave a review"
export const DEFAULT_TESTIMONIAL_PROMPT = "Tell us about your experience."
export const DEFAULT_TESTIMONIAL_BRAND_COLOR = "#b45f3a"

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

export function normalizeBrandColor(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : ""
  return HEX_COLOR_RE.test(candidate)
    ? candidate.toLowerCase()
    : DEFAULT_TESTIMONIAL_BRAND_COLOR
}

export function normalizeOptionalText(value: unknown, fallback: string) {
  const candidate = typeof value === "string" ? value.trim() : ""
  return candidate.length > 0 ? candidate : fallback
}

export function normalizeWebsiteUrl(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : ""

  if (!raw) {
    return ""
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) && !/^https?:\/\//i.test(raw)) {
    return ""
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  try {
    const url = new URL(withProtocol)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return ""
    }
    return url.toString()
  } catch {
    return ""
  }
}

export function parseTestimonialRating(value: unknown) {
  const rating =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isFinite(rating)) {
    return null
  }

  const rounded = Math.round(rating)
  return rounded >= 1 && rounded <= 5 ? rounded : null
}

export function isTestimonialReviewStatus(
  value: unknown
): value is TestimonialReviewStatus {
  return value === "pending" || value === "approved" || value === "rejected"
}

export function normalizeTestimonialReviewStatus(
  value: unknown
): TestimonialReviewStatus {
  return isTestimonialReviewStatus(value) ? value : "pending"
}

export function truncateReviewText(value: unknown, maxLength = 5000) {
  const text = typeof value === "string" ? value.trim() : ""
  return text.length > maxLength ? text.slice(0, maxLength).trim() : text
}
