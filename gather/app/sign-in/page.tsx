import Link from "next/link"

import { MagicLinkForm } from "@/components/marketing/magic-link-form"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requestMagicLinkAction } from "@/app/sign-in/actions"

export default function SignInPage() {
  return (
    <main className="page-gradient min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="space-y-6">
            <CardHeader>
              <Badge variant="accent">Consultant sign-in</Badge>
              <CardTitle className="mt-3 text-4xl">
                Magic-link access for the solo consultant workspace
              </CardTitle>
              <CardDescription>
                The MVP uses Supabase email authentication and one workspace per consultant.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MagicLinkForm action={requestMagicLinkAction} />
            </CardContent>
          </Card>

          <Card className="space-y-6">
            <CardHeader>
              <CardDescription>What happens next</CardDescription>
              <CardTitle>Auth boundaries in this scaffold</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>Consultants authenticate. Participants do not.</p>
              <p>
                Consultant-side data is designed for Supabase RLS. Public participant routes use
                server handlers so privileged operations stay off the client.
              </p>
              <p>
                If you have not configured Supabase yet, you can still inspect the dashboard in
                demo mode from the{" "}
                <Link href="/app" className="font-medium text-primary underline-offset-4 hover:underline">
                  consultant workspace
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
