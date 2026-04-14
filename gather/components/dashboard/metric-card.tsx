import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: string
  hint: string
  accent?: string
}

export function MetricCard({ label, value, hint, accent }: MetricCardProps) {
  return (
    <Card className="space-y-4">
      <CardHeader className="flex items-start justify-between gap-3 sm:flex-row">
        <div>
          <CardDescription className="uppercase tracking-[0.24em]">{label}</CardDescription>
          <CardTitle className="mt-3 text-4xl">{value}</CardTitle>
        </div>
        <Badge variant="accent" className="gap-1">
          Live
          <ArrowUpRight className="size-3.5" />
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{hint}</p>
        {accent ? <p className="text-sm font-medium text-primary">{accent}</p> : null}
      </CardContent>
    </Card>
  )
}
