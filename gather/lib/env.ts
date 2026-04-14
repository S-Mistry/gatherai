import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_REALTIME_MODEL: z.string().min(1).default("gpt-realtime"),
  OPENAI_VOICE_NAME: z.string().min(1).default("alloy"),
  BRAINTRUST_API_KEY: z.string().min(1).optional(),
  BRAINTRUST_PROJECT: z.string().min(1).default("gatherai-mvp"),
  CRON_SECRET: z.string().min(1).optional(),
})

export const env = envSchema.parse(process.env)

export const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const isSupabaseConfigured = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    env.SUPABASE_SERVICE_ROLE_KEY
)

export const isRealtimeConfigured = Boolean(env.OPENAI_API_KEY)

export const isBraintrustConfigured = Boolean(env.BRAINTRUST_API_KEY)

export const hasCronSecret = Boolean(env.CRON_SECRET)
