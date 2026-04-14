import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listProjects } from "@/lib/data/mock"

export default function ProjectsPage() {
  const projects = listProjects()

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <Badge variant="accent">Projects</Badge>
          <div>
            <h1 className="text-4xl font-semibold">Discovery projects</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Each project keeps its own configuration versions, public participant link, session
              reviews, and synthesis.
            </p>
          </div>
        </div>
        <Button asChild size="lg">
          <Link href="/app/projects/new">New project</Link>
        </Button>
      </section>

      <section className="grid gap-4">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <CardTitle>{project.name}</CardTitle>
                <CardDescription>
                  {project.clientName} • {project.sessionCounts.completed} completed •{" "}
                  {project.sessionCounts.inProgress} in progress
                </CardDescription>
              </div>
              <Badge variant={project.sessionCounts.flagged > 0 ? "warning" : "success"}>
                {project.status}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3 sm:gap-6">
                <p>Abandoned: {project.sessionCounts.abandoned}</p>
                <p>Flagged: {project.sessionCounts.flagged}</p>
                <p>Included in synthesis: {project.includedSessions}</p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/app/projects/${project.id}`}>Open project</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
