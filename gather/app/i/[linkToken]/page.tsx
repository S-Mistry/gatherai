import { notFound } from "next/navigation"

import { InterviewShell } from "@/components/participant/interview-shell"
import { AppBar } from "@/components/ui/app-bar"
import { getPublicInterviewConfig } from "@/lib/data/repository"
import { getProjectTypePreset } from "@/lib/project-types"

interface ParticipantPageProps {
  params: Promise<{
    linkToken: string
  }>
}

export default async function ParticipantPage({
  params,
}: ParticipantPageProps) {
  const { linkToken } = await params
  const config = await getPublicInterviewConfig(linkToken)

  if (!config) {
    notFound()
  }

  const preset = getProjectTypePreset(config.projectType)
  const respondentLabel =
    config.anonymityMode === "named"
      ? "you"
      : preset.anonymousRespondentLabel

  return (
    <div className="min-h-screen">
      <AppBar
        crumb={[
          { label: config.projectName },
          { label: `${respondentLabel} · live` },
        ]}
        right={
          <span className="chip clay">
            <span className="dot" />
            live conversation
          </span>
        }
      />
      <InterviewShell linkToken={linkToken} config={config} />
    </div>
  )
}
