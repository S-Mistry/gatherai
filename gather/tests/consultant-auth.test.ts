import assert from "node:assert/strict"
import test from "node:test"

import {
  getConsultantAuthProviderList,
  isGoogleConsultantAuthUser,
} from "../lib/auth/consultant-auth"

test("consultant auth accepts Google provider metadata", () => {
  const user = {
    app_metadata: {
      provider: "google",
      providers: ["google"],
    },
  }

  assert.deepEqual(getConsultantAuthProviderList(user), ["google"])
  assert.equal(isGoogleConsultantAuthUser(user), true)
})

test("consultant auth accepts linked email and Google accounts", () => {
  const user = {
    app_metadata: {
      provider: "email",
      providers: ["email", "google"],
    },
  }

  assert.deepEqual(getConsultantAuthProviderList(user), ["email", "google"])
  assert.equal(isGoogleConsultantAuthUser(user), true)
})

test("consultant auth falls back to identity providers", () => {
  const user = {
    app_metadata: {},
    identities: [{ provider: "google" }],
  }

  assert.deepEqual(getConsultantAuthProviderList(user), ["google"])
  assert.equal(isGoogleConsultantAuthUser(user), true)
})

test("consultant auth rejects email-only users", () => {
  const user = {
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    identities: [{ provider: "email" }],
  }

  assert.deepEqual(getConsultantAuthProviderList(user), ["email"])
  assert.equal(isGoogleConsultantAuthUser(user), false)
})
