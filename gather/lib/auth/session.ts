import { isGoogleConsultantAuthUser } from "@/lib/auth/consultant-auth"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type ServerSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabaseClient>>
>

export async function getAllowedConsultantUser(client: ServerSupabaseClient) {
  const {
    data: { user },
  } = await client.auth.getUser()

  if (!user) {
    return null
  }

  if (!isGoogleConsultantAuthUser(user)) {
    try {
      await client.auth.signOut()
    } catch {
      // Cookie writes are best-effort in server render contexts.
    }

    return null
  }

  return user
}

export async function getOptionalConsultantSession() {
  const client = await createServerSupabaseClient()

  if (!client) {
    return null
  }

  return getAllowedConsultantUser(client)
}
