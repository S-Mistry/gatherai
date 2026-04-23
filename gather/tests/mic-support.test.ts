import assert from "node:assert/strict"
import test from "node:test"

import {
  detectMicSupport,
  isAndroid,
  isBraveUserAgent,
  isInAppWebView,
  isIos,
} from "../lib/participant/mic-support"

const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"
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
  const ios = await detectMicSupport({
    userAgent: SAFARI_IOS,
    isSecureContext: true,
    hasMediaDevices: true,
    permissionState: "denied",
    isBrave: false,
  })
  assert.equal(ios.kind, "denied")
  if (ios.kind === "denied") {
    assert.match(ios.message, /Settings → Safari → Microphone/)
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
