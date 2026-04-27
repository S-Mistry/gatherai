import { NewProjectForm } from "@/components/dashboard/new-project-form"
import { isDiscoveryProjectsEnabled } from "@/lib/env"

export default function NewProjectPage() {
  return (
    <div className="-mt-2">
      <NewProjectForm discoveryEnabled={isDiscoveryProjectsEnabled} />
    </div>
  )
}
