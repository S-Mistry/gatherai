import { NextResponse } from "next/server"

import { getPublicTestimonialConfig } from "@/lib/data/repository"
import {
  suggestTestimonialRating,
  transcribeTestimonialAudio,
} from "@/lib/openai/testimonials"

const MAX_AUDIO_BYTES = 25 * 1024 * 1024

interface RouteContext {
  params: Promise<{
    linkToken: string
  }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { linkToken } = await params
  const config = await getPublicTestimonialConfig(linkToken)

  if (!config) {
    return NextResponse.json(
      { error: "Invalid or expired testimonial link." },
      { status: 404 }
    )
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("audio")

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "A voice recording is required." },
      { status: 400 }
    )
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "Recordings must be under 25 MB." },
      { status: 413 }
    )
  }

  const transcript = await transcribeTestimonialAudio(file)

  if (!transcript) {
    return NextResponse.json(
      { error: "We couldn't transcribe that recording. Please try again." },
      { status: 422 }
    )
  }

  let suggestedRating: number | null = null

  try {
    suggestedRating = await suggestTestimonialRating({
      transcript,
      prompt: config.prompt,
    })
  } catch (error) {
    console.error("Unable to suggest testimonial rating.", error)
  }

  return NextResponse.json({ transcript, suggestedRating })
}
