type RealtimeSessionHandle = import("@openai/agents/realtime").RealtimeSession
type RealtimeTransportHandle =
  import("@openai/agents/realtime").OpenAIRealtimeWebRTC

export function teardownRealtime({
  realtimeSessionRef,
  realtimeTransportRef,
  micStreamRef,
  agentAudioRef,
}: {
  realtimeSessionRef: { current: RealtimeSessionHandle | null }
  realtimeTransportRef: { current: RealtimeTransportHandle | null }
  micStreamRef: { current: MediaStream | null }
  agentAudioRef?: { current: HTMLAudioElement | null }
}) {
  realtimeSessionRef.current?.close()
  realtimeSessionRef.current = null
  realtimeTransportRef.current = null

  micStreamRef.current?.getTracks().forEach((track) => track.stop())
  micStreamRef.current = null

  const audio = agentAudioRef?.current
  if (audio) {
    audio.pause()
    audio.srcObject = null
  }
}

export function extractClientSecretValue(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null
  }

  if ("value" in payload && typeof payload.value === "string") {
    return payload.value
  }

  if (
    "client_secret" in payload &&
    payload.client_secret &&
    typeof payload.client_secret === "object" &&
    "value" in payload.client_secret &&
    typeof payload.client_secret.value === "string"
  ) {
    return payload.client_secret.value
  }

  return null
}
