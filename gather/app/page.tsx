import Link from "next/link"
import { ArrowRight, ChartLine, LockLaminated, MicrophoneStage } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listProjects } from "@/lib/data/mock"

export default function Page() {
  const projects = listProjects()
  const activeProject = projects[0]

  return (
    <main className="page-gradient min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel overflow-hidden">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge variant="accent" className="gap-2">
                <MicrophoneStage className="size-4" />
                Voice-first workshop discovery
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-balance sm:text-6xl">
                  Interview stakeholders at scale without losing transcript evidence.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  GatherAI turns pre-workshop discovery into a structured voice workflow:
                  share one public link, run consistent AI interviews, and surface themes,
                  contradictions, and workshop agenda inputs backed by transcript evidence.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/app">
                    Open consultant workspace
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href={`/i/${activeProject.publicLinkToken}`}>Preview participant link</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                  <CardDescription className="text-primary-foreground/75">
                    Active projects
                  </CardDescription>
                  <CardTitle className="text-5xl text-primary-foreground">
                    {projects.length}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-primary-foreground/80">
                    The current scaffold includes a consultant dashboard, participant interview
                    entry, and analysis queue architecture.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Realtime stance</CardDescription>
                  <CardTitle>WebRTC + server-minted secrets</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Browser participants connect to OpenAI Realtime over WebRTC while privileged
                    session minting stays in route handlers.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardDescription>Governance stance</CardDescription>
                  <CardTitle>Generated AGENTS, frozen docs, explicit decisions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Repo instructions are generated from canonical docs and drift-checked before
                    merges.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Badge variant="neutral">Consultant control</Badge>
              <CardTitle className="mt-3">Versioned project configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Define objectives, areas of interest, required questions, metadata prompts, and
                anonymity mode without losing provenance for existing sessions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Badge variant="neutral">Participant flow</Badge>
              <CardTitle className="mt-3">Low-friction voice interviews</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Disclosure-first entry, optional metadata, browser voice transport, interruption,
                hard duration caps, and resumable session tokens.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Badge variant="neutral">Evidence and evals</Badge>
              <CardTitle className="mt-3">Immutable generations with layered overrides</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Transcript segments, evidence refs, Braintrust-compatible quality scoring, and a
                Supabase-backed job queue for extraction and synthesis.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <Badge variant="accent">Current scaffold</Badge>
              <CardTitle className="mt-3">What is implemented in code</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {[
                {
                  icon: ChartLine,
                  title: "Consultant surfaces",
                  text: "Overview dashboard, project list, project detail, version summary, session review, and synthesis refresh.",
                },
                {
                  icon: MicrophoneStage,
                  title: "Participant entry",
                  text: "Public project route, session bootstrap, resume token flow, realtime client-secret route, and transcript event ingestion.",
                },
                {
                  icon: LockLaminated,
                  title: "Security baseline",
                  text: "Supabase Auth and RLS schema design, service-role boundaries, opaque public links, and signed session recovery tokens.",
                },
                {
                  icon: ArrowRight,
                  title: "Governance pipeline",
                  text: "Frozen PRD and spec docs, generated AGENTS instructions, pre-commit drift checks, and CI verification.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-border/70 bg-background/70 p-5"
                >
                  <item.icon className="size-6 text-primary" />
                  <h2 className="mt-4 text-lg font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Fast paths</CardDescription>
              <CardTitle>Open the parts that matter</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild size="lg" className="w-full justify-between">
                <Link href="/app">
                  Consultant workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full justify-between">
                <Link href="/sign-in">
                  Magic-link auth setup
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full justify-between">
                <Link href={`/i/${activeProject.publicLinkToken}`}>
                  Participant preview
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
