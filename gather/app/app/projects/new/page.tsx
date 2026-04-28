import { ConsultantAppBar } from "@/components/dashboard/consultant-app-bar"
import { NewProjectForm } from "@/components/dashboard/new-project-form"
import { isDiscoveryProjectsEnabled } from "@/lib/env"

export default function NewProjectPage() {
  return (
    <>
      <ConsultantAppBar
        crumb={[
          { label: "Workspace", href: "/app" },
          { label: "New project" },
        ]}
      />
      <div
        style={{
          padding: "48px 48px 80px",
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <NewProjectForm discoveryEnabled={isDiscoveryProjectsEnabled} />
      </div>
    </>
  )
}
