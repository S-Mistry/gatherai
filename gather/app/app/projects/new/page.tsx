import { NewProjectForm } from "@/components/dashboard/new-project-form"
import { isDiscoveryProjectsEnabled } from "@/lib/env"

export default function NewProjectPage() {
  return <NewProjectForm discoveryEnabled={isDiscoveryProjectsEnabled} />
}
