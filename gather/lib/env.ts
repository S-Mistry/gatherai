import { z } from "zod"

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_ACCESS_TOKEN: z.string().min(1).optional(),
  CONSULTANT_AUTH_MODE: z.string().optional(),
  SUPABASE_OAUTH_PROVIDER: z.string().optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_REALTIME_MODEL: z.string().min(1).default("gpt-realtime-1.5"),
  OPENAI_VOICE_NAME: z.string().min(1).default("marin"),
  OPENAI_SESSION_ANALYSIS_MODEL: z.string().min(1).default("gpt-5.4-mini"),
  OPENAI_SESSION_GROUNDING_MODEL: z.string().min(1).optional(),
  OPENAI_SESSION_ENRICHMENT_MODEL: z.string().min(1).optional(),
  OPENAI_SESSION_GRADER_MODEL: z.string().min(1).optional(),
  OPENAI_SESSION_ESCALATION_MODEL: z.string().min(1).optional(),
  OPENAI_PROJECT_SYNTHESIS_MODEL: z.string().min(1).default("gpt-5.4"),
  BRAINTRUST_API_KEY: z.string().min(1).optional(),
  BRAINTRUST_PROJECT: z.string().min(1).default("gatherai-mvp"),
  RECOVERY_TOKEN_SECRET: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
})

export const env = envSchema.parse(process.env)

export const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export const isSupabaseConfigured = Boolean(
  env.NEXT_PUBLIC_SUPABASE_URL &&
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    env.SUPABASE_SECRET_KEY
)

export const isRealtimeConfigured = Boolean(env.OPENAI_API_KEY)

export const isBraintrustConfigured = Boolean(env.BRAINTRUST_API_KEY)

export const hasCronSecret = Boolean(env.CRON_SECRET)

export const openAiModels = {
  sessionGrounding:
    env.OPENAI_SESSION_GROUNDING_MODEL ?? env.OPENAI_SESSION_ANALYSIS_MODEL,
  sessionEnrichment:
    env.OPENAI_SESSION_ENRICHMENT_MODEL ?? env.OPENAI_SESSION_ANALYSIS_MODEL,
  sessionGrader: env.OPENAI_SESSION_GRADER_MODEL ?? "gpt-5.4-nano",
  sessionEscalation:
    env.OPENAI_SESSION_ESCALATION_MODEL ?? env.OPENAI_PROJECT_SYNTHESIS_MODEL,
  projectSynthesis: env.OPENAI_PROJECT_SYNTHESIS_MODEL,
} as const
