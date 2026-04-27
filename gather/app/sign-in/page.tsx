import Link from "next/link"
import { redirect } from "next/navigation"

import {
  getSafeAuthNextPath,
  getSignInErrorMessage,
  getSupabaseOAuthProviderLabel,
  resolveConsultantAuthMode,
  resolveSupabaseOAuthProvider,
} from "@/lib/auth/consultant-auth"
import { getOptionalConsultantSession } from "@/lib/auth/session"
import {
  devAdminSignInAction,
  requestMagicLinkAction,
} from "@/app/sign-in/actions"
import { MagicLinkForm } from "@/components/marketing/magic-link-form"
import { AppBar } from "@/components/ui/app-bar"
import { Button } from "@/components/ui/button"
import { Tape } from "@/components/ui/ornaments"
import { env, isDevAdminLoginEnabled } from "@/lib/env"

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
      ? `Continue with ${providerLabel} to open your private workspace. No password to remember.`
      : showMagicLinkForm
        ? "We'll email a one-tap sign-in link. No password to remember."
        : "Sign-in is unavailable until the auth configuration is fixed."

  return (
    <div className="min-h-screen">
      <AppBar
        right={
          <Link
            href="/"
            className="font-sans text-sm text-[var(--ink-2)] hover:text-[var(--ink)]"
          >
            ← back to landing
          </Link>
        }
      />

      <main className="mx-auto flex w-full max-w-[520px] items-start px-6 py-16">
        <div
          className="card flat relative w-full"
          style={{ padding: "44px 48px" }}
        >
          <Tape style={{ top: -11, left: 60, transform: "rotate(-3deg)" }} />

          <span className="font-hand text-[24px] text-[var(--clay)]">
            welcome —
          </span>
          <h1
            className="font-serif"
            style={{
              fontSize: 48,
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.018em",
              margin: "8px 0 6px",
            }}
          >
            Sign in.
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--ink-2)",
              margin: "0 0 28px",
            }}
          >
            {description}
          </p>

          {errorMessage ? (
            <p
              className="font-sans"
              style={{
                fontSize: 13,
                lineHeight: 1.55,
                color: "var(--rose)",
                background: "var(--rose-soft)",
                borderRadius: 6,
                padding: "12px 16px",
                marginBottom: 24,
              }}
            >
              {errorMessage}
            </p>
          ) : null}

          {showOAuthCta && oauthHref && providerLabel ? (
            <div className="space-y-5">
              <Button asChild size="lg" className="w-full">
                <Link href={oauthHref}>Continue with {providerLabel} →</Link>
              </Button>
              <p
                className="font-sans"
                style={{
                  fontSize: 13,
                  lineHeight: 1.55,
                  color: "var(--ink-3)",
                }}
              >
                We use your verified account email to find the right private
                workspace.
              </p>
            </div>
          ) : null}

          {showMagicLinkForm ? (
            <MagicLinkForm action={requestMagicLinkAction} />
          ) : null}

          {isDevAdminLoginEnabled ? (
            <form action={devAdminSignInAction} className="space-y-3">
              <input type="hidden" name="next" value={next} />
              <Button type="submit" variant="outline" className="w-full">
                Enter as dev admin
              </Button>
              <p
                className="font-sans"
                style={{
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "var(--ink-3)",
                  margin: 0,
                }}
              >
                Local testing only: {env.DEV_ADMIN_EMAIL}
              </p>
            </form>
          ) : null}

          {!showOAuthCta && !showMagicLinkForm ? (
            <p
              className="font-sans"
              style={{ fontSize: 13, lineHeight: 1.55, color: "var(--ink-3)" }}
            >
              Fix the consultant auth environment variables, then reload this
              page.
            </p>
          ) : null}

          <hr className="divider-dashed" style={{ margin: "32px 0 20px" }} />

          <p
            className="font-sans"
            style={{
              fontSize: 12.5,
              lineHeight: 1.5,
              color: "var(--ink-3)",
              margin: "0 0 6px",
            }}
          >
            Each workspace is private. Respondent conversations never leave it.
            Words only — we don&apos;t keep audio.
          </p>
          <p
            className="font-sans"
            style={{ fontSize: 12.5, color: "var(--ink-3)", margin: 0 }}
          >
            New here?{" "}
            <Link
              href="/"
              className="text-[var(--clay)] underline-offset-4 hover:underline"
            >
              See how it works →
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
