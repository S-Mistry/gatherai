import crypto from "node:crypto"

import { env } from "@/lib/env"

function getTokenSecret() {
  return env.RECOVERY_TOKEN_SECRET ?? "gatherai-dev-secret"
}

export function signRecoveryToken(sessionId: string, expiresAt: string) {
  const payload = Buffer.from(JSON.stringify({ sessionId, expiresAt })).toString("base64url")
  const signature = crypto
    .createHmac("sha256", getTokenSecret())
    .update(payload)
    .digest("hex")

  return `${payload}.${signature}`
}

export function verifyRecoveryToken(token: string, sessionId: string) {
  try {
    const separatorIndex = token.indexOf(".")

    if (separatorIndex === -1) {
      return false
    }

    const payload = token.slice(0, separatorIndex)
    const signature = token.slice(separatorIndex + 1)
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sessionId?: string
      expiresAt?: string
    }
    const tokenSessionId = decoded.sessionId
    const expiresAt = decoded.expiresAt

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
      .update(payload)
      .digest("hex")

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}
