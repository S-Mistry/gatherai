import { createProjectAction } from "@/app/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function NewProjectPage() {
  return (
    <div className="space-y-6">
      <section className="panel">
        <Badge variant="accent">New project</Badge>
        <h1 className="mt-4 text-4xl font-semibold">New discovery project</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-muted-foreground">
          Set the objective, pick the topics, and draft the questions. You can edit everything
          after sharing the link.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Project setup</CardTitle>
          <CardDescription>
            We&apos;ll create the project and generate its participant link on save.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createProjectAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Project name
                </label>
                <Input id="name" name="name" required placeholder="Operating model redesign" />
              </div>
              <div className="space-y-2">
                <label htmlFor="clientName" className="text-sm font-medium">
                  Client name
                </label>
                <Input id="clientName" name="clientName" required placeholder="Riverstone" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="objective" className="text-sm font-medium">
                Objective
              </label>
              <Textarea
                id="objective"
                name="objective"
                required
                placeholder="Understand the friction, contradictions, and decisions the workshop must address."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="areasOfInterest" className="text-sm font-medium">
                  Topics to cover
                </label>
                <Textarea
                  id="areasOfInterest"
                  name="areasOfInterest"
                  placeholder="One topic per line — e.g., 'Approval bottlenecks'"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="requiredQuestions" className="text-sm font-medium">
                  Must-ask questions
                </label>
                <Textarea
                  id="requiredQuestions"
                  name="requiredQuestions"
                  placeholder="One question per line"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="durationCapMinutes" className="text-sm font-medium">
                  How long? (minutes)
                </label>
                <Input
                  id="durationCapMinutes"
                  name="durationCapMinutes"
                  type="number"
                  min={5}
                  max={30}
                  defaultValue={15}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="anonymityMode" className="text-sm font-medium">
                  How stakeholders are identified
                </label>
                <select
                  id="anonymityMode"
                  name="anonymityMode"
                  defaultValue="pseudonymous"
                  className="w-full rounded-2xl border border-border/70 bg-white/80 px-4 py-3 text-sm shadow-sm outline-none focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-card/70"
                >
                  <option value="named">By name</option>
                  <option value="pseudonymous">By role (e.g., &apos;Stakeholder A&apos;)</option>
                  <option value="anonymous">Fully anonymous</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" size="lg">
                Create project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
