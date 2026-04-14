import crypto from "node:crypto"

import { env } from "@/lib/env"

function getTokenSecret() {
  return env.CRON_SECRET ?? "gatherai-dev-secret"
}

export function signRecoveryToken(sessionId: string, expiresAt: string) {
  const payload = `${sessionId}.${expiresAt}`
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest("hex")

  return Buffer.from(`${payload}.${signature}`).toString("base64url")
}

export function verifyRecoveryToken(token: string, sessionId: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [tokenSessionId, expiresAt, signature] = decoded.split(".")

    if (!tokenSessionId || !expiresAt || !signature) {
      return false
    }

    if (tokenSessionId !== sessionId) {
      return false
    }

    if (new Date(expiresAt).getTime() < Date.now()) {
      return false
    }

    const expected = crypto
      .createHmac("sha256", getTokenSecret())
      .update(`${tokenSessionId}.${expiresAt}`)
      .digest("hex")

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
