import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

import { detectInterviewStartSignal } from "../lib/participant/runtime"

async function loadFixture<T>(name: string): Promise<T> {
  const url = new URL(`./fixtures/${name}`, import.meta.url)
  const contents = await readFile(url, "utf8")
  return JSON.parse(contents) as T
}

test("soft readiness phrases start the interview", async () => {
  const fixture = await loadFixture<{ affirmative: string[] }>(
    "interview-start-signals.json"
  )

  for (const phrase of fixture.affirmative) {
    const signal = detectInterviewStartSignal(phrase)
    assert.equal(signal?.kind, "affirmative")
  }
})

test("greetings and channel checks do not start the interview", async () => {
  const fixture = await loadFixture<{ ignore: string[] }>(
    "interview-start-signals.json"
  )

  for (const phrase of fixture.ignore) {
    assert.equal(detectInterviewStartSignal(phrase), null)
  }
})

test("a substantive first answer starts the interview", async () => {
  const fixture = await loadFixture<{ substantive: string[] }>(
    "interview-start-signals.json"
  )

  for (const phrase of fixture.substantive) {
    const signal = detectInterviewStartSignal(phrase)
    assert.equal(signal?.kind, "substantive")
  }
})
