"use server"

import { appUrl, isSupabaseConfigured } from "@/lib/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

interface MagicLinkState {
  status: "idle" | "success" | "error"
  message: string
}

export async function requestMagicLinkAction(
  _previousState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  const email = formData.get("email")

  if (typeof email !== "string" || !email) {
    return {
      status: "error",
      message: "Enter a valid consultant email address.",
    }
  }

  if (!isSupabaseConfigured) {
    return {
      status: "error",
      message:
        "Supabase is not configured yet. Add the environment variables in gather/.env.example to enable magic-link auth.",
    }
  }

  const client = await createServerSupabaseClient()

  if (!client) {
    return {
      status: "error",
      message: "Supabase client creation failed.",
    }
  }

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?next=/app`,
    },
  })

  if (error) {
    return {
      status: "error",
      message: error.message,
    }
  }

  return {
    status: "success",
    message: "Magic link sent. Check your email to continue into the consultant workspace.",
  }
}
