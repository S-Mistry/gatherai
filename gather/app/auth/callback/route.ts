import { NextResponse } from "next/server"

import { appUrl } from "@/lib/env"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/app"

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", appUrl))
  }

  const client = await createServerSupabaseClient()

  if (!client) {
    return NextResponse.redirect(new URL("/sign-in", appUrl))
  }

  await client.auth.exchangeCodeForSession(code)

  return NextResponse.redirect(new URL(next, appUrl))
}
