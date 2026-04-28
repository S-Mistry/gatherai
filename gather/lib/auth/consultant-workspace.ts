import type { User } from "@supabase/supabase-js"

import {
  getConsultantFullName,
  getConsultantWorkspaceName,
} from "@/lib/auth/consultant-auth"
import type { createServerSupabaseClient } from "@/lib/supabase/server"

type ServerSupabaseClient = NonNullable<
  Awaited<ReturnType<typeof createServerSupabaseClient>>
>

export async function ensureConsultantWorkspace(
  client: ServerSupabaseClient,
  user: User
) {
  const { error } = await client.rpc("ensure_consultant_workspace", {
    requested_full_name: getConsultantFullName(user),
    requested_workspace_name: getConsultantWorkspaceName(user),
  })

  if (error) {
    throw new Error(error.message)
  }
}
