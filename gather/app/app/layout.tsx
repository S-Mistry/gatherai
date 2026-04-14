import { AppShell } from "@/components/dashboard/app-shell"
import { isSupabaseConfigured } from "@/lib/env"
import { getOptionalConsultantSession } from "@/lib/auth/session"

export default async function ConsultantLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const user = await getOptionalConsultantSession()

  return (
    <AppShell userEmail={user?.email} demoMode={!isSupabaseConfigured || !user}>
      {children}
    </AppShell>
  )
}
