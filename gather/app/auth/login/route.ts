import { NextResponse } from "next/server"

import {
  buildSignInUrl,
  getSafeAuthNextPath,
  isSupabaseOAuthProvider,
  resolveConsultantAuthMode,
  resolveSupabaseOAuthProvider,
} from "@/lib/auth/consultant-auth"
import { appUrl, isSupabaseConfigured } from "@/lib/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = getSafeAuthNextPath(url.searchParams.get("next"))
  const authMode = resolveConsultantAuthMode()

  if (authMode === null) {
    return NextResponse.redirect(buildSignInUrl({ error: "auth_mode_invalid", next }))
  }

  if (authMode !== "supabase_oauth") {
    return NextResponse.redirect(buildSignInUrl({ error: "oauth_disabled", next }))
  }

  const requestedProvider = url.searchParams.get("provider")
  const provider =
    requestedProvider === null
      ? resolveSupabaseOAuthProvider()
      : isSupabaseOAuthProvider(requestedProvider)
        ? requestedProvider
        : null

  if (provider === null) {
    return NextResponse.redirect(buildSignInUrl({ error: "oauth_provider_invalid", next }))
  }

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(buildSignInUrl({ error: "supabase_unconfigured", next }))
  }

  const client = await createServerSupabaseClient()

  if (!client) {
    return NextResponse.redirect(buildSignInUrl({ error: "supabase_unconfigured", next }))
  }

  const callbackUrl = new URL("/auth/callback", appUrl)
  callbackUrl.searchParams.set("next", next)

  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callbackUrl.toString(),
    },
  })

  if (error || !data.url) {
    return NextResponse.redirect(buildSignInUrl({ error: "oauth_start_failed", next }))
  }

  return NextResponse.redirect(data.url)
}
