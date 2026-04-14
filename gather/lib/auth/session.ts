import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function getOptionalConsultantSession() {
  const client = await createServerSupabaseClient()

  if (!client) {
    return null
  }

  const {
    data: { user },
  } = await client.auth.getUser()

  return user
}
