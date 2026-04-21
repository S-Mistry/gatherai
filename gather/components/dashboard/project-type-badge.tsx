import type { ProjectType } from "@/lib/domain/types"
import { getProjectTypeBadge } from "@/lib/project-types"

import { Badge } from "@/components/ui/badge"

export function ProjectTypeBadge({ projectType }: { projectType: ProjectType }) {
  const badge = getProjectTypeBadge(projectType)

  return <Badge variant={badge.variant}>{badge.label}</Badge>
}
