import { env, isRealtimeConfigured } from "@/lib/env"
import type { PublicInterviewConfig } from "@/lib/domain/types"
import {
  buildParticipantRealtimeAudioConfig,
  buildRealtimeInstructions,
} from "@/lib/openai/realtime-config"

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
        audio: buildParticipantRealtimeAudioConfig({
          voice: env.OPENAI_VOICE_NAME,
        }),
      },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to mint realtime client secret: ${text}`)
  }

  return response.json()
}
