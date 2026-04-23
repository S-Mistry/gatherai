import { notFound } from "next/navigation"

import { InterviewShell } from "@/components/participant/interview-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPublicInterviewConfig } from "@/lib/data/repository"
import { getParticipantDurationCopy } from "@/lib/participant/time-copy"
import { getProjectTypePreset } from "@/lib/project-types"

interface ParticipantPageProps {
  params: Promise<{
    linkToken: string
  }>
}

export default async function ParticipantPage({ params }: ParticipantPageProps) {
  const { linkToken } = await params
  const config = await getPublicInterviewConfig(linkToken)

  if (!config) {
    notFound()
  }

  const preset = getProjectTypePreset(config.projectType)
  const durationCopy = getParticipantDurationCopy(
    config.projectType,
    config.durationCapMinutes
  )
  const disclosureLines = config.disclosure
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <main className="page-gradient min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <Badge variant={preset.badgeVariant}>{preset.label}</Badge>
            <h1 className="text-4xl font-semibold text-balance">
              {preset.participantTitle}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              {config.intro} {durationCopy.introSentence}
            </p>
          </div>

          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-primary-foreground">
                What happens to my voice?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-6 text-primary-foreground/85">
              {disclosureLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </CardContent>
          </Card>
        </section>

        <InterviewShell linkToken={linkToken} config={config} />
      </div>
    </main>
  )
}
