import assert from "node:assert/strict"
import test from "node:test"

import {
  classifyMicAcquireFailure,
  detectMicSupport,
  getMicBrowserFamily,
  isAndroid,
  isBraveUserAgent,
  isInAppWebView,
  isIos,
  type MicSupport,
} from "../lib/participant/mic-support"

const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
const CHROME_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.52 Mobile/15E148 Safari/604.1"
const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
const BRAVE_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1 Brave/1.63"
const BRAVE_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Brave/122.0.0.0 Chrome/122.0.0.0 Mobile Safari/537.36"
const WHATSAPP_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.4.75"
const INSTAGRAM_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.0.0 Mobile Safari/537.36 Instagram 320.0.0.40.109 Android"
const LINKEDIN_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]"
const FIREFOX_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/125.0 Mobile/15E148 Safari/605.1.15"

test("platform helpers identify iOS and Android user agents", () => {
  assert.equal(isIos(SAFARI_IOS), true)
  assert.equal(isIos(BRAVE_IOS), true)
  assert.equal(isIos(CHROME_ANDROID), false)
  assert.equal(isAndroid(CHROME_ANDROID), true)
  assert.equal(isAndroid(BRAVE_ANDROID), true)
  assert.equal(isAndroid(SAFARI_IOS), false)
})

test("isBraveUserAgent recognizes Brave marker in the UA string", () => {
  assert.equal(isBraveUserAgent(BRAVE_IOS), true)
  assert.equal(isBraveUserAgent(BRAVE_ANDROID), true)
  assert.equal(isBraveUserAgent(SAFARI_IOS), false)
  assert.equal(isBraveUserAgent(CHROME_ANDROID), false)
})

test("getMicBrowserFamily distinguishes Safari, Chrome, and Brave mobile browsers", () => {
  assert.equal(getMicBrowserFamily(SAFARI_IOS), "ios-safari")
  assert.equal(getMicBrowserFamily(CHROME_IOS), "ios-chrome")
  assert.equal(getMicBrowserFamily(BRAVE_IOS), "ios-brave")
  assert.equal(getMicBrowserFamily(CHROME_ANDROID), "android-chrome")
  assert.equal(getMicBrowserFamily(BRAVE_ANDROID), "android-brave")
  assert.equal(getMicBrowserFamily(FIREFOX_IOS), "other")
})

test("isInAppWebView detects common in-app browsers", () => {
  assert.deepEqual(isInAppWebView(WHATSAPP_IOS), { app: "WhatsApp" })
  assert.deepEqual(isInAppWebView(INSTAGRAM_ANDROID), { app: "Instagram" })
  assert.deepEqual(isInAppWebView(LINKEDIN_IOS), { app: "LinkedIn" })
  assert.equal(isInAppWebView(SAFARI_IOS), null)
  assert.equal(isInAppWebView(CHROME_ANDROID), null)
})

test("detectMicSupport flags insecure contexts first", async () => {
  const result = await detectMicSupport({
    userAgent: SAFARI_IOS,
    isSecureContext: false,
    hasMediaDevices: true,
  })
  assert.equal(result.kind, "insecure")
})

test("detectMicSupport gives Brave-specific copy when mediaDevices is missing on Brave", async () => {
  const result = await detectMicSupport({
    userAgent: BRAVE_ANDROID,
    isSecureContext: true,
    hasMediaDevices: false,
    isBrave: true,
  })
  assert.equal(result.kind, "unsupported")
  if (result.kind === "unsupported") {
    assert.equal(result.reason, "brave-shields")
    assert.match(result.message, /Brave Shields/)
  }
})

test("detectMicSupport flags in-app WebViews with the app name", async () => {
  const result = await detectMicSupport({
    userAgent: WHATSAPP_IOS,
    isSecureContext: true,
    hasMediaDevices: false,
    isBrave: false,
  })
  assert.equal(result.kind, "unsupported")
  if (result.kind === "unsupported") {
    assert.equal(result.reason, "webview")
    assert.equal(result.appName, "WhatsApp")
    assert.match(result.message, /Open in Safari/)
  }
})

test("detectMicSupport falls back to no-api for missing mediaDevices on a regular browser", async () => {
  const result = await detectMicSupport({
    userAgent: "Mozilla/5.0 (compatible; unknown browser)",
    isSecureContext: true,
    hasMediaDevices: false,
    isBrave: false,
  })
  assert.equal(result.kind, "unsupported")
  if (result.kind === "unsupported") {
    assert.equal(result.reason, "no-api")
  }
})

test("detectMicSupport surfaces denied permission with platform-specific recovery copy", async () => {
  const safari = await detectMicSupport({
    userAgent: SAFARI_IOS,
    isSecureContext: true,
    hasMediaDevices: true,
    permissionState: "denied",
    isBrave: false,
  })
  assert.equal(safari.kind, "denied")
  if (safari.kind === "denied") {
    assert.match(safari.message, /Settings → Safari → Microphone/)
  }

  const chromeIos = await detectMicSupport({
    userAgent: CHROME_IOS,
    isSecureContext: true,
    hasMediaDevices: true,
    permissionState: "denied",
    isBrave: false,
  })
  assert.equal(chromeIos.kind, "denied")
  if (chromeIos.kind === "denied") {
    assert.match(chromeIos.message, /Settings → Chrome → Microphone/)
    assert.match(chromeIos.message, /microphone icon in the address bar/)
    assert.doesNotMatch(chromeIos.message, /Settings → Safari → Microphone/)
  }

  const braveIos = await detectMicSupport({
    userAgent: BRAVE_IOS,
    isSecureContext: true,
    hasMediaDevices: true,
    permissionState: "denied",
    isBrave: true,
  })
  assert.equal(braveIos.kind, "denied")
  if (braveIos.kind === "denied") {
    assert.match(braveIos.message, /Settings → Brave → Microphone/)
    assert.doesNotMatch(braveIos.message, /Settings → Safari → Microphone/)
  }

  const android = await detectMicSupport({
    userAgent: CHROME_ANDROID,
    isSecureContext: true,
    hasMediaDevices: true,
    permissionState: "denied",
    isBrave: false,
  })
  assert.equal(android.kind, "denied")
  if (android.kind === "denied") {
    assert.match(android.message, /lock icon/)
  }
})

test("detectMicSupport returns ready on a capable, granted or prompt-state browser", async () => {
  const granted = await detectMicSupport({
    userAgent: CHROME_ANDROID,
    isSecureContext: true,
    hasMediaDevices: true,
    permissionState: "granted",
    isBrave: false,
  })
  assert.equal(granted.kind, "ready")

  const fresh = await detectMicSupport({
    userAgent: SAFARI_IOS,
    isSecureContext: true,
    hasMediaDevices: true,
    permissionState: "prompt",
    isBrave: false,
  })
  assert.equal(fresh.kind, "ready")
})

test("classifyMicAcquireFailure uses Chrome iOS guidance for no-prompt deny failures", () => {
  const failure = classifyMicAcquireFailure({
    errorName: "NotAllowedError",
    browserFamily: "ios-chrome",
    support: { kind: "ready" },
  })

  assert.equal(failure.code, "denied")
  assert.match(failure.message, /Settings → Chrome → Microphone/)
  assert.doesNotMatch(failure.message, /Settings → Safari → Microphone/)
})

test("classifyMicAcquireFailure uses Brave iOS guidance for no-prompt deny failures", () => {
  const failure = classifyMicAcquireFailure({
    errorName: "NotAllowedError",
    browserFamily: "ios-brave",
    support: { kind: "ready" },
  })

  assert.equal(failure.code, "denied")
  assert.match(failure.message, /Settings → Brave → Microphone/)
  assert.doesNotMatch(failure.message, /Settings → Safari → Microphone/)
})

test("classifyMicAcquireFailure keeps Safari-only recovery copy on Safari", () => {
  const failure = classifyMicAcquireFailure({
    errorName: "NotAllowedError",
    browserFamily: "ios-safari",
    support: { kind: "ready" },
  })

  assert.equal(failure.code, "denied")
  assert.match(failure.message, /Settings → Safari → Microphone/)
})

test("classifyMicAcquireFailure prefers Brave Shields guidance over generic Brave copy", () => {
  const support: MicSupport = {
    kind: "unsupported",
    reason: "brave-shields",
    message:
      "Brave Shields is blocking the microphone. Tap the lion icon next to the address bar, set Shields to 'Standard' for this site, then reload.",
  }

  const failure = classifyMicAcquireFailure({
    errorName: "NotAllowedError",
    browserFamily: "ios-brave",
    support,
  })

  assert.equal(failure.code, "unsupported")
  assert.match(failure.message, /Brave Shields is blocking the microphone/)
  assert.doesNotMatch(failure.message, /Settings → Brave → Microphone/)
})
