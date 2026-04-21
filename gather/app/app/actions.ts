"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  createProjectConfigVersion,
  createProjectFromForm,
  enqueueSynthesisRefresh,
  saveProjectSynthesisOverride,
  saveSessionClaimSuppression,
  saveSessionOverride,
  saveSessionQualityOverride,
  setSessionExcludedFromSynthesis,
} from "@/lib/data/repository"

export async function createProjectAction(formData: FormData) {
  const record = await createProjectFromForm({
    projectType: String(formData.get("projectType") ?? "discovery"),
    name: String(formData.get("name") ?? ""),
    clientName: String(formData.get("clientName") ?? ""),
    objective: String(formData.get("objective") ?? ""),
    areasOfInterest: String(formData.get("areasOfInterest") ?? ""),
    requiredQuestions: String(formData.get("requiredQuestions") ?? ""),
    durationCapMinutes: Number(formData.get("durationCapMinutes") ?? 15),
    anonymityMode: String(formData.get("anonymityMode") ?? "pseudonymous"),
  })

  revalidatePath("/app")
  revalidatePath("/app/projects")
  redirect(`/app/projects/${record.project.id}`)
}

export async function refreshSynthesisAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")
  await enqueueSynthesisRefresh(projectId)
  revalidatePath(`/app/projects/${projectId}`)
}

export async function toggleSessionExclusionAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")
  const sessionId = String(formData.get("sessionId") ?? "")
  const excluded = String(formData.get("excluded") ?? "false") === "true"

  await setSessionExcludedFromSynthesis(sessionId, excluded)
  revalidatePath(`/app/projects/${projectId}`)
  revalidatePath(`/app/projects/${projectId}/sessions/${sessionId}`)
}

export async function saveSessionOverrideAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")
  const sessionId = String(formData.get("sessionId") ?? "")
  const editedSummary = String(formData.get("editedSummary") ?? "")
  const consultantNotes = String(formData.get("consultantNotes") ?? "")

  await saveSessionOverride(sessionId, editedSummary, consultantNotes)
  revalidatePath(`/app/projects/${projectId}/sessions/${sessionId}`)
}

export async function toggleSessionClaimSuppressionAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")
  const sessionId = String(formData.get("sessionId") ?? "")
  const claimId = String(formData.get("claimId") ?? "")
  const suppressed = String(formData.get("suppressed") ?? "false") === "true"

  await saveSessionClaimSuppression(sessionId, claimId, suppressed)
  revalidatePath(`/app/projects/${projectId}`)
  revalidatePath(`/app/projects/${projectId}/sessions/${sessionId}`)
}

export async function saveSessionQualityOverrideAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")
  const sessionId = String(formData.get("sessionId") ?? "")
  const setting = String(formData.get("setting") ?? "generated")
  const note = String(formData.get("note") ?? "")

  await saveSessionQualityOverride({
    sessionId,
    mode: setting === "generated" ? "generated" : "manual",
    lowQuality:
      setting === "manual-low" ? true : setting === "manual-healthy" ? false : undefined,
    note,
  })
  revalidatePath("/app")
  revalidatePath(`/app/projects/${projectId}`)
  revalidatePath(`/app/projects/${projectId}/sessions/${sessionId}`)
}

export async function saveProjectSynthesisOverrideAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")
  const editedNarrative = String(formData.get("editedNarrative") ?? "")
  const consultantNotes = String(formData.get("consultantNotes") ?? "")

  await saveProjectSynthesisOverride(projectId, editedNarrative, consultantNotes)
  revalidatePath(`/app/projects/${projectId}`)
}

export async function saveProjectConfigVersionAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")

  await createProjectConfigVersion({
    projectId,
    projectName: String(formData.get("projectName") ?? ""),
    clientName: String(formData.get("clientName") ?? ""),
    objective: String(formData.get("objective") ?? ""),
    areasOfInterest: String(formData.get("areasOfInterest") ?? ""),
    requiredQuestions: String(formData.get("requiredQuestions") ?? ""),
    durationCapMinutes: Number(formData.get("durationCapMinutes") ?? 15),
    anonymityMode: String(formData.get("anonymityMode") ?? "pseudonymous"),
    backgroundContext: String(formData.get("backgroundContext") ?? ""),
  })

  revalidatePath("/app")
  revalidatePath("/app/projects")
  revalidatePath(`/app/projects/${projectId}`)
}

export async function signOutAction() {
  const client = await createServerSupabaseClient()

  if (client) {
    await client.auth.signOut()
  }

  redirect("/sign-in")
}
