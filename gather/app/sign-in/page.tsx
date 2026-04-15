import Link from "next/link"
import { ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { redirect } from "next/navigation"

import {
  getSafeAuthNextPath,
  getSignInErrorMessage,
  getSupabaseOAuthProviderLabel,
  resolveConsultantAuthMode,
  resolveSupabaseOAuthProvider,
} from "@/lib/auth/consultant-auth"
import { getOptionalConsultantSession } from "@/lib/auth/session"
import { requestMagicLinkAction } from "@/app/sign-in/actions"
import { MagicLinkForm } from "@/components/marketing/magic-link-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SearchParams = Record<string, string | string[] | undefined>

type SignInPageProps = {
  searchParams?: Promise<SearchParams> | SearchParams
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const user = await getOptionalConsultantSession()

  if (user) {
    redirect("/app")
  }

  const authMode = resolveConsultantAuthMode()
  const oauthProvider = resolveSupabaseOAuthProvider()
  const next = getSafeAuthNextPath(
    Array.isArray(resolvedSearchParams.next)
      ? resolvedSearchParams.next[0]
      : resolvedSearchParams.next
  )
  const queryErrorMessage = getSignInErrorMessage(resolvedSearchParams.error)

  const configurationErrorMessage =
    authMode === null
      ? "Consultant sign-in is not configured correctly for this environment."
      : authMode === "supabase_oauth" && oauthProvider === null
        ? "The configured OAuth provider is not supported."
        : null

  const errorMessage = queryErrorMessage ?? configurationErrorMessage
  const providerLabel =
    oauthProvider === null ? null : getSupabaseOAuthProviderLabel(oauthProvider)
  const showOAuthCta = authMode === "supabase_oauth" && providerLabel !== null
  const showMagicLinkForm = authMode === "supabase_magic_link"
  const oauthHref =
    oauthProvider === null
      ? null
      : `/auth/login?provider=${oauthProvider}&next=${encodeURIComponent(next)}`

  const description =
    showOAuthCta && providerLabel !== null
      ? `Continue with ${providerLabel} to open your private consultant workspace. No password to remember.`
      : showMagicLinkForm
        ? "We'll email you a one-tap sign-in link. No password to remember."
        : "Consultant sign-in is unavailable until the auth configuration is fixed."

  return (
    <main className="page-gradient min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[480px]">
          <Card className="space-y-6">
            <CardHeader>
              <Badge variant="accent">Welcome</Badge>
              <CardTitle className="mt-3 text-4xl">Sign in to your workspace</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {errorMessage ? (
                <p className="rounded-3xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-6 text-rose-700 dark:text-rose-300">
                  {errorMessage}
                </p>
              ) : null}

              {showOAuthCta && oauthHref && providerLabel ? (
                <div className="space-y-4">
                  <Button asChild size="lg" className="w-full">
                    <Link href={oauthHref}>
                      Continue with {providerLabel}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <p className="text-sm leading-6 text-muted-foreground">
                    We use your verified account email to identify the right private workspace.
                  </p>
                </div>
              ) : null}

              {showMagicLinkForm ? <MagicLinkForm action={requestMagicLinkAction} /> : null}

              {!showOAuthCta && !showMagicLinkForm ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  Fix the consultant auth environment variables, then reload this page.
                </p>
              ) : null}

              <p className="text-xs leading-6 text-muted-foreground">
                Your data stays yours. Each workspace is private, and stakeholder conversations
                never leave it.
              </p>
              <p className="text-xs text-muted-foreground">
                New here?{" "}
                <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
                  See how it works →
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
