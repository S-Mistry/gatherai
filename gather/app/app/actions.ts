"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  archiveProject,
  createProjectConfigVersion,
  createProjectFromForm,
  createTestimonialLink,
  enqueueSynthesisRefresh,
  permanentlyDeleteArchivedProject,
  permanentlyDeleteArchivedProjects,
  restoreArchivedProject,
  setSessionExcludedFromSynthesis,
  updateTestimonialReviewStatus,
} from "@/lib/data/repository"
import { isTestimonialReviewStatus } from "@/lib/testimonials"

export async function createProjectAction(formData: FormData) {
  const record = await createProjectFromForm({
    projectType: String(formData.get("projectType") ?? "feedback"),
    name: String(formData.get("name") ?? ""),
    objective: String(formData.get("objective") ?? ""),
    areasOfInterest: String(formData.get("areasOfInterest") ?? ""),
    requiredQuestions: String(formData.get("requiredQuestions") ?? ""),
    durationCapMinutes: Number(formData.get("durationCapMinutes") ?? 15),
    anonymityMode: String(formData.get("anonymityMode") ?? "pseudonymous"),
    testimonialBusinessName: String(
      formData.get("testimonialBusinessName") ?? ""
    ),
    testimonialWebsiteUrl: String(formData.get("testimonialWebsiteUrl") ?? ""),
    testimonialBrandColor: String(formData.get("testimonialBrandColor") ?? ""),
    testimonialHeadline: String(formData.get("testimonialHeadline") ?? ""),
    testimonialPrompt: String(formData.get("testimonialPrompt") ?? ""),
  })

  revalidatePath("/app")
  revalidatePath("/app/projects")
  redirect(`/app/projects/${record.project.id}`)
}

export async function archiveProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")

  await archiveProject(projectId)
  revalidatePath("/app")
  revalidatePath("/app/projects")
  revalidatePath(`/app/projects/${projectId}`)
}

export async function restoreArchivedProjectAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")

  await restoreArchivedProject(projectId)
  revalidatePath("/app")
  revalidatePath("/app/projects")
  revalidatePath(`/app/projects/${projectId}`)
}

export async function permanentlyDeleteArchivedProjectAction(
  formData: FormData
) {
  const projectId = String(formData.get("projectId") ?? "")

  await permanentlyDeleteArchivedProject(projectId)
  revalidatePath("/app")
  revalidatePath("/app/projects")
}

export async function permanentlyDeleteArchivedProjectsAction() {
  await permanentlyDeleteArchivedProjects()
  revalidatePath("/app")
  revalidatePath("/app/projects")
}

export async function updateTestimonialReviewStatusAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")
  const reviewId = String(formData.get("reviewId") ?? "")
  const status = String(formData.get("status") ?? "")

  if (!isTestimonialReviewStatus(status)) {
    throw new Error("Invalid testimonial review status.")
  }

  await updateTestimonialReviewStatus({ projectId, reviewId, status })
  revalidatePath(`/app/projects/${projectId}`)
}

export async function createTestimonialLinkAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")

  await createTestimonialLink({
    projectId,
    businessName: String(formData.get("businessName") ?? ""),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
    brandColor: String(formData.get("brandColor") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    prompt: String(formData.get("prompt") ?? ""),
  })

  revalidatePath(`/app/projects/${projectId}`)
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

export async function saveProjectConfigVersionAction(formData: FormData) {
  const projectId = String(formData.get("projectId") ?? "")

  await createProjectConfigVersion({
    projectId,
    projectName: String(formData.get("projectName") ?? ""),
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
