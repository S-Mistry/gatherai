import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: string
  hint: string
  accent?: string
}

export function MetricCard({ label, value, hint, accent }: MetricCardProps) {
  return (
    <Card className="space-y-3">
      <CardHeader>
        <CardDescription className="text-xs uppercase tracking-[0.24em]">{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-sm leading-6 text-muted-foreground">{hint}</p>
        {accent ? <p className="text-sm font-medium text-primary">{accent}</p> : null}
      </CardContent>
    </Card>
  )
}
