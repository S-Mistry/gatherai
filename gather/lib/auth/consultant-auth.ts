import { appUrl, env } from "@/lib/env"

const consultantAuthModes = ["supabase_oauth", "supabase_magic_link"] as const
const supabaseOAuthProviders = ["google", "github"] as const
const signInErrorCodes = [
  "auth_mode_invalid",
  "auth_callback_failed",
  "auth_callback_missing_code",
  "auth_provider_not_allowed",
  "oauth_disabled",
  "oauth_provider_invalid",
  "oauth_start_failed",
  "supabase_unconfigured",
  "workspace_provision_failed",
] as const

type ConsultantAuthMode = (typeof consultantAuthModes)[number]
type SupabaseOAuthProvider = (typeof supabaseOAuthProviders)[number]
type SignInErrorCode = (typeof signInErrorCodes)[number]

const DEFAULT_CONSULTANT_AUTH_MODE =
  "supabase_oauth" satisfies ConsultantAuthMode
const DEFAULT_SUPABASE_OAUTH_PROVIDER = "google" satisfies SupabaseOAuthProvider
const DEFAULT_POST_SIGN_IN_PATH = "/app"
const REQUIRED_CONSULTANT_AUTH_PROVIDER = "google"

type ConsultantAuthUser = {
  app_metadata?: Record<string, unknown> | null
  identities?: Array<{ provider?: string | null }> | null
}

type ConsultantProfileUser = ConsultantAuthUser & {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

function isConsultantAuthMode(
  value: string | null | undefined
): value is ConsultantAuthMode {
  return consultantAuthModes.some((mode) => mode === value)
}

function isSupabaseOAuthProvider(
  value: string | null | undefined
): value is SupabaseOAuthProvider {
  return supabaseOAuthProviders.some((provider) => provider === value)
}

function isSignInErrorCode(
  value: string | null | undefined
): value is SignInErrorCode {
  return signInErrorCodes.some((code) => code === value)
}

function addProvider(providers: Set<string>, value: unknown) {
  if (typeof value === "string" && value.trim()) {
    providers.add(value.trim())
  }
}

function getStringMetadataValue(
  metadata: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = metadata?.[key]
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export function getConsultantAuthProviderList(user: ConsultantAuthUser) {
  const providers = new Set<string>()
  const appProviders = user.app_metadata?.providers

  addProvider(providers, user.app_metadata?.provider)

  if (Array.isArray(appProviders)) {
    appProviders.forEach((provider) => addProvider(providers, provider))
  }

  if (Array.isArray(user.identities)) {
    user.identities.forEach((identity) =>
      addProvider(providers, identity.provider)
    )
  }

  return [...providers].sort()
}

export function isGoogleConsultantAuthUser(user: ConsultantAuthUser) {
  return getConsultantAuthProviderList(user).includes(
    REQUIRED_CONSULTANT_AUTH_PROVIDER
  )
}

export function getConsultantFullName(user: ConsultantProfileUser) {
  return (
    getStringMetadataValue(user.user_metadata, "full_name") ??
    getStringMetadataValue(user.user_metadata, "name")
  )
}

export function getConsultantWorkspaceName(user: ConsultantProfileUser) {
  return (
    getStringMetadataValue(user.user_metadata, "workspace_name") ??
    getConsultantFullName(user) ??
    (typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0]
      : null) ??
    "Consultant workspace"
  )
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
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
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
    case "auth_provider_not_allowed":
      return "Use Google sign-in for consultant access. Email magic links are no longer accepted."
    case "oauth_disabled":
      return "OAuth sign-in is disabled in this environment."
    case "oauth_provider_invalid":
      return "That sign-in provider is not supported here."
    case "oauth_start_failed":
      return "We couldn't start sign-in. Check the Supabase OAuth provider settings and try again."
    case "supabase_unconfigured":
      return "Supabase auth is not configured yet. Add the required auth environment variables first."
    case "workspace_provision_failed":
      return "We couldn't prepare your workspace after Google sign-in. Try again."
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
