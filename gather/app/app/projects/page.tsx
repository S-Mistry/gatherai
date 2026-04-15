import Link from "next/link"
import { FolderOpen } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { listProjects } from "@/lib/data/repository"

export default async function ProjectsPage() {
  const projects = await listProjects()

  return (
    <div className="space-y-6">
      <section className="panel flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-4xl font-semibold">Projects</h1>
          </div>
        </div>
        <Button asChild size="lg">
          <Link href="/app/projects/new">New project</Link>
        </Button>
      </section>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet."
          description="Create one to share a link with stakeholders."
          action={
            <Button asChild>
              <Link href="/app/projects/new">New project</Link>
            </Button>
          }
        />
      ) : (
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
                <Link href={`/app/projects/${project.id}`}>Open</Link>
              </Button>
            </CardContent>
          </Card>
          ))}
        </section>
      )}
    </div>
  )
}
