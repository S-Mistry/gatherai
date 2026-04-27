import assert from "node:assert/strict"
import test from "node:test"

import {
  extractClientSecretValue,
  teardownRealtime,
} from "../lib/participant/realtime-session"

test("extractClientSecretValue reads flat and nested client-secret payloads", () => {
  assert.equal(extractClientSecretValue({ value: "flat-secret" }), "flat-secret")
  assert.equal(
    extractClientSecretValue({
      client_secret: { value: "nested-secret" },
    }),
    "nested-secret"
  )
  assert.equal(extractClientSecretValue({ client_secret: {} }), null)
  assert.equal(extractClientSecretValue(null), null)
})

test("teardownRealtime closes session, stops tracks, and clears audio element", () => {
  let closed = false
  let stoppedTracks = 0
  let paused = false
  const audio = {
    pause: () => {
      paused = true
    },
    srcObject: { kind: "audio-stream" },
  } as unknown as HTMLAudioElement

  teardownRealtime({
    realtimeSessionRef: {
      current: {
        close: () => {
          closed = true
        },
      } as unknown as import("@openai/agents/realtime").RealtimeSession,
    },
    realtimeTransportRef: {
      current:
        {} as unknown as import("@openai/agents/realtime").OpenAIRealtimeWebRTC,
    },
    micStreamRef: {
      current: {
        getTracks: () => [
          { stop: () => stoppedTracks++ },
          { stop: () => stoppedTracks++ },
        ],
      } as unknown as MediaStream,
    },
    agentAudioRef: { current: audio },
  })

  assert.equal(closed, true)
  assert.equal(stoppedTracks, 2)
  assert.equal(paused, true)
  assert.equal(audio.srcObject, null)
})
