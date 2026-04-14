import { notFound } from "next/navigation"

import { InterviewShell } from "@/components/participant/interview-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPublicInterviewConfig } from "@/lib/data/mock"

interface ParticipantPageProps {
  params: Promise<{
    linkToken: string
  }>
}

export default async function ParticipantPage({ params }: ParticipantPageProps) {
  const { linkToken } = await params
  const config = getPublicInterviewConfig(linkToken)

  if (!config) {
    notFound()
  }

  return (
    <main className="page-gradient min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <Badge variant="accent">Public participant link</Badge>
            <h1 className="text-4xl font-semibold text-balance">
              Share perspective before the workshop
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              This short AI interview helps the consultant understand pain points, contradictions,
              and workshop expectations before live facilitation begins.
            </p>
          </div>

          <Card className="bg-primary text-primary-foreground">
            <CardHeader>
              <CardDescription className="text-primary-foreground/80">
                Disclosure summary
              </CardDescription>
              <CardTitle className="text-primary-foreground">Transcript-only MVP</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6 text-primary-foreground/80">
              You are speaking with an AI interviewer. The conversation is transcribed for workshop
              discovery. Audio is not stored in this MVP, and the consultant reviews the results.
            </CardContent>
          </Card>
        </section>

        <InterviewShell linkToken={linkToken} config={config} />
      </div>
    </main>
  )
}
