import { NextResponse } from "next/server"
import { z } from "zod"

import { submitTestimonialReview } from "@/lib/data/repository"

const reviewSchema = z.object({
  transcript: z.string().trim().min(2).max(5000),
  reviewerName: z.string().trim().max(120).optional(),
  rating: z.number().int().min(1).max(5),
  suggestedRating: z.number().int().min(1).max(5).nullable().optional(),
})

interface RouteContext {
  params: Promise<{
    linkToken: string
  }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { linkToken } = await params
  const payload = reviewSchema.safeParse(await request.json().catch(() => ({})))

  if (!payload.success) {
    return NextResponse.json(
      { error: "A written review and star rating are required." },
      { status: 400 }
    )
  }

  const review = await submitTestimonialReview(linkToken, payload.data)

  if (!review) {
    return NextResponse.json(
      { error: "Invalid or expired testimonial link." },
      { status: 404 }
    )
  }

  return NextResponse.json({ review })
}
