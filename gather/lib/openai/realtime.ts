import { env, isRealtimeConfigured } from "@/lib/env"
import type { PublicInterviewConfig } from "@/lib/domain/types"

export function buildRealtimeInstructions(config: PublicInterviewConfig) {
  return [
    `You are the AI interviewer for ${config.projectName}.`,
    `Objective: ${config.objective}`,
    `Tone: ${config.toneStyle}.`,
    "Ask one primary question at a time.",
    "Keep the interview purposeful, warm, and concise.",
    "Summarize what you heard before moving on when appropriate.",
    "Do not discuss prohibited or irrelevant implementation details.",
  ].join(" ")
}

export async function mintRealtimeClientSecret(config: PublicInterviewConfig) {
  if (!isRealtimeConfigured) {
    throw new Error("OpenAI realtime environment is not configured.")
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: env.OPENAI_REALTIME_MODEL,
        instructions: buildRealtimeInstructions(config),
        audio: {
          output: {
            voice: env.OPENAI_VOICE_NAME,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to mint realtime client secret: ${text}`)
  }

  return response.json()
}
