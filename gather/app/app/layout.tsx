import { AppShell } from "@/components/dashboard/app-shell"
import { redirect } from "next/navigation"

import { isSupabaseConfigured } from "@/lib/env"
import { getOptionalConsultantSession } from "@/lib/auth/session"

export const dynamic = "force-dynamic"

export default async function ConsultantLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getOptionalConsultantSession()

  if (!isSupabaseConfigured || !user) {
    redirect("/sign-in")
  }

  return (
    <AppShell userEmail={user.email} demoMode={false}>
      {children}
    </AppShell>
  )
}
