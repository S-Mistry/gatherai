import { appUrl, env } from "@/lib/env"

const consultantAuthModes = ["supabase_oauth", "supabase_magic_link"] as const
const supabaseOAuthProviders = ["google", "github"] as const
const signInErrorCodes = [
  "auth_mode_invalid",
  "auth_callback_failed",
  "auth_callback_missing_code",
  "oauth_disabled",
  "oauth_provider_invalid",
  "oauth_start_failed",
  "supabase_unconfigured",
] as const

type ConsultantAuthMode = (typeof consultantAuthModes)[number]
type SupabaseOAuthProvider = (typeof supabaseOAuthProviders)[number]
type SignInErrorCode = (typeof signInErrorCodes)[number]

const DEFAULT_CONSULTANT_AUTH_MODE = "supabase_oauth" satisfies ConsultantAuthMode
const DEFAULT_SUPABASE_OAUTH_PROVIDER = "google" satisfies SupabaseOAuthProvider
const DEFAULT_POST_SIGN_IN_PATH = "/app"

function isConsultantAuthMode(value: string | null | undefined): value is ConsultantAuthMode {
  return consultantAuthModes.some((mode) => mode === value)
}

function isSupabaseOAuthProvider(
  value: string | null | undefined
): value is SupabaseOAuthProvider {
  return supabaseOAuthProviders.some((provider) => provider === value)
}

function isSignInErrorCode(value: string | null | undefined): value is SignInErrorCode {
  return signInErrorCodes.some((code) => code === value)
}

export function resolveConsultantAuthMode(
  value: string | null | undefined = env.CONSULTANT_AUTH_MODE
) {
  const candidate = value ?? DEFAULT_CONSULTANT_AUTH_MODE
  return isConsultantAuthMode(candidate) ? candidate : null
}

export function resolveSupabaseOAuthProvider(
  value: string | null | undefined = env.SUPABASE_OAUTH_PROVIDER
) {
  const candidate = value ?? DEFAULT_SUPABASE_OAUTH_PROVIDER
  return isSupabaseOAuthProvider(candidate) ? candidate : null
}

export function getSafeAuthNextPath(value: string | null | undefined) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_POST_SIGN_IN_PATH
  }

  return value
}

export function buildSignInUrl(options?: {
  error?: SignInErrorCode
  next?: string | null
}) {
  const url = new URL("/sign-in", appUrl)
  const next = getSafeAuthNextPath(options?.next)

  if (options?.error) {
    url.searchParams.set("error", options.error)
  }

  if (next !== DEFAULT_POST_SIGN_IN_PATH) {
    url.searchParams.set("next", next)
  }

  return url
}

export function getSupabaseOAuthProviderLabel(provider: SupabaseOAuthProvider) {
  return provider === "github" ? "GitHub" : "Google"
}

export function getSignInErrorMessage(error: string | string[] | undefined) {
  const candidate = Array.isArray(error) ? error[0] : error

  if (!isSignInErrorCode(candidate)) {
    return null
  }

  switch (candidate) {
    case "auth_mode_invalid":
      return "Consultant sign-in is not configured correctly for this environment."
    case "auth_callback_failed":
      return "We couldn't complete sign-in. Try again from the start."
    case "auth_callback_missing_code":
      return "The sign-in callback was incomplete. Start the sign-in flow again."
    case "oauth_disabled":
      return "OAuth sign-in is disabled in this environment."
    case "oauth_provider_invalid":
      return "That sign-in provider is not supported here."
    case "oauth_start_failed":
      return "We couldn't start sign-in. Check the Supabase OAuth provider settings and try again."
    case "supabase_unconfigured":
      return "Supabase auth is not configured yet. Add the required auth environment variables first."
  }
}

export {
  DEFAULT_POST_SIGN_IN_PATH,
  consultantAuthModes,
  isSupabaseOAuthProvider,
  signInErrorCodes,
  supabaseOAuthProviders,
}

export type { ConsultantAuthMode, SignInErrorCode, SupabaseOAuthProvider }
