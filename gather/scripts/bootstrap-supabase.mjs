import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const appRoot = path.resolve(__dirname, "..")
const envPath = path.join(appRoot, ".env.local")
const migrationsDir = path.join(appRoot, "supabase", "migrations")
const consultantAuthModes = ["supabase_oauth", "supabase_magic_link"]
const supabaseOAuthProviders = ["google", "github"]
const DEFAULT_CONSULTANT_AUTH_MODE = "supabase_oauth"
const DEFAULT_SUPABASE_OAUTH_PROVIDER = "google"

function parseEnvFile(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=")
        return [line.slice(0, separator), line.slice(separator + 1)]
      })
  )
}

async function loadEnv() {
  const fileContents = await fs.readFile(envPath, "utf8").catch(() => "")
  const fileEnv = parseEnvFile(fileContents)

  return {
    ...fileEnv,
    ...process.env,
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`${response.status} ${response.statusText}: ${body}`)
  }

  return response
}

function normalizeUrl(value) {
  return String(value ?? "").replace(/\/+$/, "")
}

function parseCommaSeparatedValues(value) {
  return new Set(
    String(value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  )
}

function resolveConsultantAuthMode(env) {
  const candidate = env.CONSULTANT_AUTH_MODE ?? DEFAULT_CONSULTANT_AUTH_MODE

  if (!consultantAuthModes.includes(candidate)) {
    throw new Error(
      `CONSULTANT_AUTH_MODE must be one of ${consultantAuthModes.join(", ")}. Received: ${candidate}`
    )
  }

  return candidate
}

function resolveSupabaseOAuthProvider(env, consultantAuthMode) {
  if (consultantAuthMode !== "supabase_oauth") {
    return null
  }

  const candidate =
    env.SUPABASE_OAUTH_PROVIDER ?? DEFAULT_SUPABASE_OAUTH_PROVIDER

  if (!supabaseOAuthProviders.includes(candidate)) {
    throw new Error(
      `SUPABASE_OAUTH_PROVIDER must be one of ${supabaseOAuthProviders.join(", ")}. Received: ${candidate}`
    )
  }

  return candidate
}

function buildProjectAuthCallbackUrl(projectUrl) {
  return new URL("/auth/v1/callback", projectUrl).toString()
}

function getOAuthProviderState(authConfig, provider) {
  if (provider === "google") {
    return {
      label: "Google",
      enabled: Boolean(authConfig.external_google_enabled),
      clientIdPresent: Boolean(authConfig.external_google_client_id),
    }
  }

  if (provider === "github") {
    return {
      label: "GitHub",
      enabled: Boolean(authConfig.external_github_enabled),
      clientIdPresent: Boolean(authConfig.external_github_client_id),
    }
  }

  throw new Error(`Unsupported OAuth provider: ${provider}`)
}

function applyOptionalOAuthProviderPatch({
  authPatch,
  consultantAuthMode,
  env,
  oauthProvider,
}) {
  if (consultantAuthMode !== "supabase_oauth" || oauthProvider !== "google") {
    return false
  }

  const googleClientId =
    env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID?.trim() ?? ""
  const googleClientSecret =
    env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET?.trim() ?? ""

  if (!googleClientId && !googleClientSecret) {
    return false
  }

  if (!googleClientId || !googleClientSecret) {
    throw new Error(
      "Set both SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID and SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET before running bootstrap."
    )
  }

  Object.assign(authPatch, {
    external_google_enabled: true,
    external_google_client_id: googleClientId,
    external_google_secret: googleClientSecret,
  })

  return true
}

function applyConsultantAuthHardeningPatch({ authPatch, consultantAuthMode }) {
  if (consultantAuthMode !== "supabase_oauth") {
    return
  }

  Object.assign(authPatch, {
    disable_signup: false,
    external_email_enabled: false,
  })
}

function validateConfiguredAuth({
  appUrl,
  authConfig,
  consultantAuthMode,
  oauthProvider,
  projectAuthCallbackUrl,
  redirectUrls,
}) {
  if (normalizeUrl(authConfig.site_url) !== normalizeUrl(appUrl)) {
    throw new Error(
      `Supabase site_url mismatch. Expected ${appUrl} but received ${authConfig.site_url ?? "<unset>"}.`
    )
  }

  const configuredRedirectUrls = parseCommaSeparatedValues(
    authConfig.uri_allow_list
  )
  const missingRedirectUrls = redirectUrls.filter(
    (url) => !configuredRedirectUrls.has(url)
  )

  if (missingRedirectUrls.length > 0) {
    throw new Error(
      `Supabase redirect allow list is missing: ${missingRedirectUrls.join(", ")}.`
    )
  }

  if (consultantAuthMode !== "supabase_oauth" || oauthProvider === null) {
    return null
  }

  if (authConfig.disable_signup) {
    throw new Error(
      "Supabase signups must remain enabled for open Google consultant sign-in."
    )
  }

  if (authConfig.external_email_enabled !== false) {
    throw new Error(
      "Supabase Email auth must be disabled when consultant sign-in is Google-only."
    )
  }

  const providerState = getOAuthProviderState(authConfig, oauthProvider)

  if (providerState.enabled && providerState.clientIdPresent) {
    return providerState
  }

  if (oauthProvider === "google") {
    throw new Error(
      [
        "Supabase Google OAuth is selected for consultant sign-in, but the provider is not fully configured.",
        "Enable Google in Supabase Dashboard > Auth > Providers > Google and add the Google client ID and client secret,",
        "or provide SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID and SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET before running bootstrap.",
        `Google OAuth redirect URI: ${projectAuthCallbackUrl}`,
        `Supabase redirect allow list entries: ${redirectUrls.join(", ")}`,
      ].join(" ")
    )
  }

  throw new Error(
    `Supabase ${providerState.label} OAuth is selected for consultant sign-in, but the provider is not fully configured in this project.`
  )
}

async function main() {
  const env = await loadEnv()
  const accessToken = env.SUPABASE_ACCESS_TOKEN
  const projectUrl =
    env.NEXT_PUBLIC_SUPABASE_URL ?? "https://hxyrtblqnqxybvvphgvt.supabase.co"
  const projectRef = new URL(projectUrl).hostname.split(".")[0]
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const consultantAuthMode = resolveConsultantAuthMode(env)
  const oauthProvider = resolveSupabaseOAuthProvider(env, consultantAuthMode)
  const shouldWriteEnv = process.argv.includes("--write-env")
  const redirectUrls = [
    `${appUrl}/auth/callback`,
    `${appUrl}/auth/callback?next=/app`,
  ]
  const projectAuthCallbackUrl = buildProjectAuthCallbackUrl(projectUrl)

  if (!accessToken) {
    throw new Error(
      "SUPABASE_ACCESS_TOKEN is required in gather/.env.local or the shell."
    )
  }

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  }

  const keysResponse = await request(
    `https://api.supabase.com/v1/projects/${projectRef}/api-keys?reveal=true`,
    { headers }
  )
  const keys = await keysResponse.json()
  const publishableKey = keys.find((key) => key.type === "publishable")?.api_key
  const secretKey = keys.find((key) => key.type === "secret")?.api_key

  if (!publishableKey || !secretKey) {
    throw new Error("Unable to reveal both publishable and secret API keys.")
  }

  const authConfigResponse = await request(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    { headers }
  )
  const authConfig = await authConfigResponse.json()
  const uriAllowList = parseCommaSeparatedValues(authConfig.uri_allow_list)
  redirectUrls.forEach((url) => uriAllowList.add(url))
  const authPatch = {
    site_url: appUrl,
    uri_allow_list: [...uriAllowList].join(","),
  }
  applyConsultantAuthHardeningPatch({ authPatch, consultantAuthMode })
  const oauthProviderConfiguredFromEnv = applyOptionalOAuthProviderPatch({
    authPatch,
    consultantAuthMode,
    env,
    oauthProvider,
  })

  await request(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify(authPatch),
    }
  )

  const verifiedAuthConfigResponse = await request(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    { headers }
  )
  const verifiedAuthConfig = await verifiedAuthConfigResponse.json()
  const oauthProviderState = validateConfiguredAuth({
    appUrl,
    authConfig: verifiedAuthConfig,
    consultantAuthMode,
    oauthProvider,
    projectAuthCallbackUrl,
    redirectUrls,
  })

  const baseSchemaCheckResponse = await request(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `
          select exists (
            select 1
            from information_schema.tables
            where table_schema = 'public'
              and table_name = 'projects'
          ) as has_base_schema
        `,
      }),
    }
  )
  const [{ has_base_schema: hasBaseSchema }] =
    await baseSchemaCheckResponse.json()
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((entry) => entry.endsWith(".sql"))
    .sort()
    .filter((entry) => !hasBaseSchema || entry !== "0001_mvp_schema.sql")

  for (const migrationFile of migrationFiles) {
    const migrationSql = await fs.readFile(
      path.join(migrationsDir, migrationFile),
      "utf8"
    )
    await request(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query: migrationSql }),
      }
    )
  }

  const verifyResponse = await request(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: `
          with expected_tables as (
            select unnest(array[
              'profiles',
              'workspaces',
              'workspace_members',
              'projects',
              'project_config_versions',
              'project_public_links',
              'participant_sessions',
              'transcript_segments',
              'session_outputs_generated',
              'project_syntheses_generated',
              'quality_scores',
              'analysis_jobs',
              'testimonial_links',
              'testimonial_reviews',
              'prompt_versions',
              'model_versions',
              'audit_logs'
            ]) as table_name
          )
          select
            exists (
              select 1
              from pg_namespace
              where nspname = 'app'
            ) as has_app_schema,
            has_schema_privilege('authenticated', 'app', 'USAGE') as authenticated_has_app_usage,
            (select count(*) from expected_tables et
              join information_schema.tables it
                on it.table_schema = 'public'
               and it.table_name = et.table_name) as table_count,
            (select count(*) from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public'
               and p.proname in ('handle_new_user','ensure_consultant_workspace','claim_analysis_jobs','release_stale_analysis_jobs')) as public_function_count,
            (select count(*) from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'app'
               and p.proname in ('claim_analysis_jobs','release_stale_analysis_jobs','current_user_has_google_provider')) as app_function_count,
            (select count(*) from pg_policies where schemaname = 'public') as policy_count
        `,
      }),
    }
  )
  const [verification] = await verifyResponse.json()

  if (!verification?.has_app_schema) {
    throw new Error(
      "Supabase bootstrap verification failed: schema app is missing."
    )
  }

  if (!verification?.authenticated_has_app_usage) {
    throw new Error(
      "Supabase bootstrap verification failed: role authenticated is missing USAGE on schema app."
    )
  }

  if (shouldWriteEnv) {
    const current = await fs.readFile(envPath, "utf8").catch(() => "")
    const currentEnv = parseEnvFile(current)
    const nextEnv = {
      ...currentEnv,
      NEXT_PUBLIC_APP_URL: appUrl,
      NEXT_PUBLIC_SUPABASE_URL: projectUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
      SUPABASE_SECRET_KEY: secretKey,
      RECOVERY_TOKEN_SECRET:
        currentEnv.RECOVERY_TOKEN_SECRET ??
        crypto.randomBytes(32).toString("hex"),
      CRON_SECRET:
        currentEnv.CRON_SECRET ?? crypto.randomBytes(32).toString("hex"),
    }
    const orderedKeys = [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SECRET_KEY",
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID",
      "SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET",
      "OPENAI_API_KEY",
      "OPENAI_REALTIME_MODEL",
      "OPENAI_VOICE_NAME",
      "OPENAI_TESTIMONIAL_TRANSCRIPTION_MODEL",
      "OPENAI_TESTIMONIAL_RATING_MODEL",
      "BRAINTRUST_API_KEY",
      "BRAINTRUST_PROJECT",
      "RECOVERY_TOKEN_SECRET",
      "CRON_SECRET",
    ]
    const remainingKeys = Object.keys(nextEnv)
      .filter((key) => !orderedKeys.includes(key))
      .sort()
    const lines = [...orderedKeys, ...remainingKeys]
      .filter((key) => key in nextEnv)
      .map((key) => `${key}=${nextEnv[key]}`)
    await fs.writeFile(envPath, `${lines.join("\n")}\n`, "utf8")
  }

  console.log(
    JSON.stringify(
      {
        projectRef,
        appUrl,
        consultantAuthMode,
        oauthProvider,
        projectAuthCallbackUrl,
        redirectUrls,
        emailAuthEnabled: verifiedAuthConfig.external_email_enabled,
        signupDisabled: verifiedAuthConfig.disable_signup,
        oauthProviderConfiguredFromEnv,
        oauthProviderState,
        appliedMigrations: migrationFiles,
        publishableKeyPrefix: publishableKey.slice(0, 18),
        secretKeyPrefix: secretKey.slice(0, 14),
        verification,
        envUpdated: shouldWriteEnv,
      },
      null,
      2
    )
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
