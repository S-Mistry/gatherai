import { NextResponse } from "next/server"

import { buildSignInUrl, getSafeAuthNextPath } from "@/lib/auth/consultant-auth"
import { ensureConsultantWorkspace } from "@/lib/auth/consultant-workspace"
import { getAllowedConsultantUser } from "@/lib/auth/session"
import { appUrl } from "@/lib/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = getSafeAuthNextPath(url.searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(
      buildSignInUrl({ error: "auth_callback_missing_code", next })
    )
  }

  const client = await createServerSupabaseClient()

  if (!client) {
    return NextResponse.redirect(
      buildSignInUrl({ error: "supabase_unconfigured", next })
    )
  }

  const { error } = await client.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      buildSignInUrl({ error: "auth_callback_failed", next })
    )
  }

  const user = await getAllowedConsultantUser(client)

  if (!user) {
    return NextResponse.redirect(
      buildSignInUrl({ error: "auth_provider_not_allowed", next })
    )
  }

  try {
    await ensureConsultantWorkspace(client, user)
  } catch {
    await client.auth.signOut()

    return NextResponse.redirect(
      buildSignInUrl({ error: "workspace_provision_failed", next })
    )
  }

  return NextResponse.redirect(new URL(next, appUrl))
}
