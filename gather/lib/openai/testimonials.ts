import { z } from "zod"

import { env, openAiModels } from "@/lib/env"
import { parseTestimonialRating } from "@/lib/testimonials"

type JsonSchema = Record<string, unknown>

const testimonialRatingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
})

const testimonialRatingJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    rating: { type: "integer", minimum: 1, maximum: 5 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["rating", "confidence"],
} satisfies JsonSchema

function requireOpenAiKey() {
  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for testimonial transcription.")
  }

  return env.OPENAI_API_KEY
}

function safeObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function extractResponseText(data: unknown) {
  const output = Array.isArray(safeObject(data).output)
    ? (safeObject(data).output as unknown[])
    : []

  for (const entry of output) {
    const item = safeObject(entry)
    const content = Array.isArray(item.content) ? item.content : []

    for (const contentEntry of content) {
      const part = safeObject(contentEntry)

      if (typeof part.text === "string" && part.text.trim()) {
        return part.text.trim()
      }

      if (typeof part.output_text === "string" && part.output_text.trim()) {
        return part.output_text.trim()
      }
    }
  }

  return null
}

export async function transcribeTestimonialAudio(file: File) {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("model", openAiModels.testimonialTranscription)
  formData.append("response_format", "json")
  formData.append(
    "prompt",
    "This is a short customer testimonial or review. Transcribe the review accurately."
  )

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireOpenAiKey()}`,
      },
      body: formData,
    }
  )

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      `OpenAI transcription request failed: ${
        JSON.stringify(payload) || response.statusText
      }`
    )
  }

  const text = safeObject(payload).text
  return typeof text === "string" ? text.trim() : ""
}

export async function suggestTestimonialRating(input: {
  transcript: string
  prompt: string
}) {
  const transcript = input.transcript.trim()

  if (!transcript) {
    return null
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModels.testimonialRating,
      store: false,
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "Rate the customer's review sentiment from 1 to 5 stars. Use 5 for strongly positive, 3 for mixed or neutral, and 1 for strongly negative. Return only JSON.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Prompt: ${input.prompt}\n\nReview transcript:\n${transcript}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "testimonial_rating",
          strict: true,
          schema: testimonialRatingJsonSchema,
        },
      },
    }),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      `OpenAI testimonial rating request failed: ${
        JSON.stringify(payload) || response.statusText
      }`
    )
  }

  const text = extractResponseText(payload)

  if (!text) {
    return null
  }

  let json: unknown

  try {
    json = JSON.parse(text)
  } catch {
    return null
  }

  const parsed = testimonialRatingSchema.safeParse(json)

  if (!parsed.success) {
    return null
  }

  return parseTestimonialRating(parsed.data.rating)
}
