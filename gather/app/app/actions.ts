"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import {
  createProjectFromForm,
  enqueueSynthesisRefresh,
  saveSessionOverride,
  setSessionExcludedFromSynthesis,
} from "@/lib/data/repository"

export async function createProjectAction(formData: FormData) {
  const record = await createProjectFromForm({
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
