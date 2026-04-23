export type MicSupport =
  | { kind: "ready" }
  | { kind: "insecure"; message: string }
  | {
      kind: "unsupported"
      reason: "webview" | "brave-shields" | "no-api"
      message: string
      appName?: string
    }
  | { kind: "denied"; message: string }

interface NavigatorBraveAPI {
  brave?: {
    isBrave?: () => Promise<boolean>
  }
}

interface DetectOptions {
  userAgent?: string
  navigator?: Navigator
  isSecureContext?: boolean
  permissionState?: "granted" | "denied" | "prompt"
  hasMediaDevices?: boolean
  isBrave?: boolean
}

const WEBVIEW_PATTERNS: Array<{ app: string; regex: RegExp }> = [
  { app: "Facebook", regex: /FBAN|FBAV|FB_IAB|FBIOS/i },
  { app: "Instagram", regex: /Instagram/i },
  { app: "WhatsApp", regex: /WhatsApp/i },
  { app: "LinkedIn", regex: /LinkedInApp/i },
  { app: "Line", regex: /\bLine\//i },
  { app: "Twitter", regex: /Twitter/i },
  { app: "TikTok", regex: /musical_ly|Bytedance|TikTok/i },
  { app: "WeChat", regex: /MicroMessenger/i },
  { app: "Snapchat", regex: /Snapchat/i },
  { app: "Pinterest", regex: /Pinterest/i },
  { app: "Slack", regex: /Slack/i },
]

export function isIos(userAgent: string): boolean {
  return /iPad|iPhone|iPod/.test(userAgent)
}

export function isAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent)
}

export function isInAppWebView(userAgent: string): { app: string } | null {
  for (const entry of WEBVIEW_PATTERNS) {
    if (entry.regex.test(userAgent)) {
      return { app: entry.app }
    }
  }
  return null
}

export function isBraveUserAgent(userAgent: string): boolean {
  return /\bBrave\//i.test(userAgent)
}

export async function isBraveNavigator(nav?: Navigator): Promise<boolean> {
  if (!nav) return false
  const brave = (nav as Navigator & NavigatorBraveAPI).brave
  if (!brave?.isBrave) return false
  try {
    return await brave.isBrave()
  } catch {
    return false
  }
}

function platformSettingsHint(userAgent: string): string {
  if (isIos(userAgent)) {
    return "On iPhone, open Settings → Safari → Microphone (or the app's site settings) and allow this site, then reload."
  }
  if (isAndroid(userAgent)) {
    return "On Android, tap the lock icon in the address bar, enable Microphone, then reload."
  }
  return "Open your browser settings, allow microphone access for this site, then reload."
}

export async function detectMicSupport(
  options: DetectOptions = {}
): Promise<MicSupport> {
  const nav =
    options.navigator ??
    (typeof navigator !== "undefined" ? navigator : undefined)
  const userAgent = options.userAgent ?? nav?.userAgent ?? ""
  const isSecure =
    options.isSecureContext ??
    (typeof window !== "undefined" ? window.isSecureContext : true)
  const hasMediaDevices =
    options.hasMediaDevices ??
    Boolean(nav?.mediaDevices && typeof nav.mediaDevices.getUserMedia === "function")
  const brave =
    options.isBrave ?? (isBraveUserAgent(userAgent) || (await isBraveNavigator(nav)))
  const webview = isInAppWebView(userAgent)

  if (isSecure === false) {
    return {
      kind: "insecure",
      message:
        "Open this link over HTTPS. Mobile browsers block microphone access on insecure pages.",
    }
  }

  if (!hasMediaDevices) {
    if (brave) {
      return {
        kind: "unsupported",
        reason: "brave-shields",
        message:
          "Brave Shields is blocking the microphone. Tap the lion icon next to the address bar, set Shields to 'Standard' for this site, then reload.",
      }
    }
    if (webview) {
      return {
        kind: "unsupported",
        reason: "webview",
        appName: webview.app,
        message:
          isIos(userAgent)
            ? `${webview.app}'s in-app browser can't access the microphone. Tap the ⋯ menu and choose "Open in Safari", then try again.`
            : `${webview.app}'s in-app browser can't access the microphone. Tap the ⋯ menu and choose "Open in Chrome", then try again.`,
      }
    }
    return {
      kind: "unsupported",
      reason: "no-api",
      message:
        "This browser can't access the microphone. Try the latest Safari on iPhone or Chrome on Android.",
    }
  }

  let permissionState = options.permissionState
  if (permissionState === undefined && nav && "permissions" in nav) {
    try {
      const permissions = (
        nav as Navigator & {
          permissions?: {
            query?: (descriptor: { name: PermissionName }) => Promise<{
              state: "granted" | "denied" | "prompt"
            }>
          }
        }
      ).permissions
      const result = await permissions?.query?.({
        name: "microphone" as PermissionName,
      })
      permissionState = result?.state
    } catch {
      permissionState = undefined
    }
  }

  if (permissionState === "denied") {
    return {
      kind: "denied",
      message: `Microphone access is blocked for this site. ${platformSettingsHint(userAgent)}`,
    }
  }

  return { kind: "ready" }
}

export interface MicDiagnostics {
  userAgent: string
  isSecureContext: boolean
  hasMediaDevices: boolean
  isBrave: boolean
  webviewApp: string | null
  platform: "ios" | "android" | "other"
  support: MicSupport
}

export async function collectMicDiagnostics(): Promise<MicDiagnostics> {
  const nav = typeof navigator !== "undefined" ? navigator : undefined
  const userAgent = nav?.userAgent ?? ""
  const isSecure =
    typeof window !== "undefined" ? window.isSecureContext : true
  const hasMediaDevices = Boolean(
    nav?.mediaDevices && typeof nav.mediaDevices.getUserMedia === "function"
  )
  const brave =
    isBraveUserAgent(userAgent) || (await isBraveNavigator(nav))
  const webview = isInAppWebView(userAgent)
  const platform = isIos(userAgent)
    ? "ios"
    : isAndroid(userAgent)
      ? "android"
      : "other"
  const support = await detectMicSupport({
    userAgent,
    navigator: nav,
    isSecureContext: isSecure,
    hasMediaDevices,
    isBrave: brave,
  })
  return {
    userAgent,
    isSecureContext: isSecure,
    hasMediaDevices,
    isBrave: brave,
    webviewApp: webview?.app ?? null,
    platform,
    support,
  }
}
