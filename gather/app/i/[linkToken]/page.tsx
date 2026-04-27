import { notFound } from "next/navigation"

import { InterviewShell } from "@/components/participant/interview-shell"
import { AppBar } from "@/components/ui/app-bar"
import { Tape } from "@/components/ui/ornaments"
import { getPublicInterviewConfig } from "@/lib/data/repository"
import { getParticipantDurationCopy } from "@/lib/participant/time-copy"
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
  const durationCopy = getParticipantDurationCopy(
    config.projectType,
    config.durationCapMinutes
  )
  const disclosureLines = config.disclosure
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  return (
    <div className="min-h-screen">
      <AppBar
        right={
          <span className="chip clay">
            <span className="dot" />
            words only · we don&apos;t keep audio
          </span>
        }
      />
      <main className="mx-auto w-full max-w-[1320px] px-6 py-9 sm:px-8 lg:px-10 space-y-8">
        <section
          className="grid gap-7 lg:grid-cols-[1.15fr_0.85fr] lg:items-start"
        >
          <div className="card flat relative" style={{ padding: "32px 36px" }}>
            <Tape style={{ top: -11, left: 60, transform: "rotate(-3deg)" }} />
            <div className="font-hand text-[24px] text-[var(--clay)]">
              hello —
            </div>
            <h1
              className="font-serif"
              style={{
                fontSize: 44,
                fontWeight: 400,
                lineHeight: 1.05,
                letterSpacing: "-0.012em",
                margin: "8px 0 14px",
              }}
            >
              {preset.participantTitle}
            </h1>
            <p
              className="font-sans"
              style={{
                fontSize: 15,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                margin: 0,
              }}
            >
              {config.intro} {durationCopy.introSentence}
            </p>
          </div>

          <aside
            className="card flat"
            style={{ padding: "26px 28px", background: "var(--card-2)" }}
          >
            <span className="eyebrow">What happens to my voice?</span>
            <div className="font-sans mt-3 space-y-2 text-[13.5px] leading-6 text-[var(--ink-2)]">
              {disclosureLines.map((line) => (
                <p key={line} className="m-0">
                  {line}
                </p>
              ))}
            </div>
          </aside>
        </section>

        <InterviewShell linkToken={linkToken} config={config} />
      </main>
    </div>
  )
}
