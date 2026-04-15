import Link from "next/link"
import { ArrowRight, ChartLine, LockLaminated, MicrophoneStage } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  return (
    <main className="page-gradient min-h-screen">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel overflow-hidden">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge variant="accent" className="gap-2">
                <MicrophoneStage className="size-4" />
                For workshop facilitators
              </Badge>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-balance sm:text-6xl">
                  Run 20 stakeholder conversations before your workshop — without running 20
                  calls.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                  Share one link. A thoughtful AI interviewer listens to each stakeholder for
                  10–15 minutes and hands you back themes, contradictions, and an agenda — every
                  line traceable to a real quote.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/sign-in">
                    Go to workspace
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/sign-in">See what stakeholders see</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
              <Card className="bg-primary text-primary-foreground">
                <CardHeader>
                  <CardTitle className="text-primary-foreground">Runs in a browser</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-primary-foreground/85">
                    No app install. Stakeholders click a link and start talking.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Evidence, not vibes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Every theme links back to the transcript segment it came from.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Consistent interviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Same must-ask questions, same depth, across every stakeholder.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <ChartLine className="size-6 text-primary" />
              <CardTitle className="mt-3">Set it up in minutes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Write the objective, list the topics, add your must-ask questions. Share the link
                the same afternoon.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MicrophoneStage className="size-6 text-primary" />
              <CardTitle className="mt-3">Stakeholders just talk</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                One tap to start. The AI interviewer asks one thing at a time and follows up
                where it matters. Stakeholders can pause or end whenever.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <LockLaminated className="size-6 text-primary" />
              <CardTitle className="mt-3">You walk in prepared</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Themes, contradictions, and a suggested agenda — each bullet linked to the quote
                it came from.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Ready when you are</CardTitle>
              <CardDescription>
                Sign in to create your first project, or preview the stakeholder experience.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-in">
                  Go to workspace
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sign-in">See what stakeholders see</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Built for pre-workshop discovery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                Most workshops start with guesswork. This one doesn&apos;t. Hear from every
                stakeholder before you walk into the room.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
