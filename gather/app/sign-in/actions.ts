"use server"

import { redirect } from "next/navigation"

import { resolveConsultantAuthMode } from "@/lib/auth/consultant-auth"
import {
  appUrl,
  env,
  isDevAdminLoginEnabled,
  isSupabaseConfigured,
} from "@/lib/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

interface MagicLinkState {
  status: "idle" | "success" | "error"
  message: string
}

export async function requestMagicLinkAction(
  _previousState: MagicLinkState,
  formData: FormData
): Promise<MagicLinkState> {
  if (resolveConsultantAuthMode() !== "supabase_magic_link") {
    return {
      status: "error",
      message: "Magic-link sign-in is disabled in this environment.",
    }
  }

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
        "Supabase is not configured yet. Add the publishable and secret key environment variables in gather/.env.example to enable consultant sign-in.",
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
      shouldCreateUser: false,
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
    message:
      "Magic link sent. Check your email to continue into the consultant workspace.",
  }
}

export async function devAdminSignInAction(formData: FormData) {
  if (
    resolveConsultantAuthMode() === "supabase_oauth" ||
    !isDevAdminLoginEnabled ||
    !isSupabaseConfigured
  ) {
    throw new Error("Dev admin sign-in is not enabled for this environment.")
  }

  const next = String(formData.get("next") ?? "/app")

  const client = await createServerSupabaseClient()

  if (!client) {
    throw new Error("Supabase client creation failed.")
  }

  const { error } = await client.auth.signInWithPassword({
    email: env.DEV_ADMIN_EMAIL!,
    password: env.DEV_ADMIN_PASSWORD!,
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/app")
}
