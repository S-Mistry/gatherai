import { redirect } from "next/navigation"

import { ConsultantSessionProvider } from "@/components/dashboard/consultant-session-context"
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
    <ConsultantSessionProvider
      value={{ userEmail: user.email ?? null, demoMode: false }}
    >
      <div className="flex min-h-screen flex-col">{children}</div>
    </ConsultantSessionProvider>
  )
}
