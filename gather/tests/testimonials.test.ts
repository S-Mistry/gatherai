import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_TESTIMONIAL_BRAND_COLOR,
  isTestimonialReviewStatus,
  normalizeBrandColor,
  normalizeTestimonialReviewStatus,
  normalizeWebsiteUrl,
  parseTestimonialRating,
  truncateReviewText,
} from "../lib/testimonials"

test("testimonial rating parser accepts only one to five stars", () => {
  assert.equal(parseTestimonialRating(1), 1)
  assert.equal(parseTestimonialRating("5"), 5)
  assert.equal(parseTestimonialRating(3.4), 3)
  assert.equal(parseTestimonialRating(0), null)
  assert.equal(parseTestimonialRating(6), null)
  assert.equal(parseTestimonialRating("bad"), null)
})

test("testimonial review status normalizes untrusted values", () => {
  assert.equal(isTestimonialReviewStatus("pending"), true)
  assert.equal(isTestimonialReviewStatus("approved"), true)
  assert.equal(isTestimonialReviewStatus("rejected"), true)
  assert.equal(isTestimonialReviewStatus("archived"), false)
  assert.equal(normalizeTestimonialReviewStatus("approved"), "approved")
  assert.equal(normalizeTestimonialReviewStatus("archived"), "pending")
})

test("testimonial setup helpers normalize website and color inputs", () => {
  assert.equal(normalizeWebsiteUrl("example.com"), "https://example.com/")
  assert.equal(
    normalizeWebsiteUrl("https://example.com/reviews"),
    "https://example.com/reviews"
  )
  assert.equal(normalizeWebsiteUrl("ftp://example.com"), "")
  assert.equal(normalizeBrandColor("#AABBCC"), "#aabbcc")
  assert.equal(normalizeBrandColor("bad"), DEFAULT_TESTIMONIAL_BRAND_COLOR)
})

test("testimonial review text is trimmed and bounded", () => {
  assert.equal(truncateReviewText("  a useful review  "), "a useful review")
  assert.equal(truncateReviewText("abcdef", 3), "abc")
})
