import type { SessionEventsRequestBody } from "@/lib/participant/realtime-history"
import { extractClientSecretValue } from "@/lib/participant/realtime-session"

interface SessionStartPayload {
  session: {
    id: string
  }
  recoveryToken: string
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error
  }

  return fallback
}

async function postJson(
  url: string,
  body: unknown,
  fallbackMessage: string
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackMessage))
  }

  return payload
}

export async function startPublicParticipantSession(linkToken: string) {
  const payload = await postJson(
    `/api/public/links/${linkToken}/sessions`,
    { metadata: {} },
    "We couldn't start the interview. Please refresh and try again."
  )

  return payload as SessionStartPayload
}

export async function requestParticipantClientSecret(sessionId: string) {
  const payload = await postJson(
    `/api/public/sessions/${sessionId}/client-secret`,
    {},
    "We can't start a live voice session right now. Try refreshing the page — if it keeps happening, let the consultant know."
  )
  const secret = extractClientSecretValue(payload)

  if (!secret) {
    throw new Error(
      "We can't start a live voice session right now. Try refreshing the page — if it keeps happening, let the consultant know."
    )
  }

  return secret
}

export async function postParticipantSessionEvents(
  sessionId: string,
  body: SessionEventsRequestBody,
  fallbackMessage: string
) {
  return postJson(
    `/api/public/sessions/${sessionId}/events`,
    body,
    fallbackMessage
  )
}

export async function completePublicParticipantSession(
  sessionId: string,
  body: {
    elapsedSeconds: number
  }
) {
  return postJson(
    `/api/public/sessions/${sessionId}/complete`,
    body,
    "We couldn't wrap up the interview after local completion."
  )
}
