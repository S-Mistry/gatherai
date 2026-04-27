import { notFound } from "next/navigation"

import { TestimonialCaptureShell } from "@/components/testimonials/testimonial-capture-shell"
import { AppBar } from "@/components/ui/app-bar"
import { getPublicTestimonialConfig } from "@/lib/data/repository"

interface TestimonialPageProps {
  params: Promise<{
    linkToken: string
  }>
}

export default async function TestimonialPage({
  params,
}: TestimonialPageProps) {
  const { linkToken } = await params
  const config = await getPublicTestimonialConfig(linkToken)

  if (!config) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppBar
        right={
          <span className="chip sage">
            <span className="dot" />
            words only · we don&apos;t keep audio
          </span>
        }
      />
      <main className="mx-auto w-full max-w-[860px] flex-1 px-6 py-12 sm:px-8">
        <TestimonialCaptureShell config={config} />
      </main>
      <footer
        className="flex items-center justify-between px-9 py-5"
        style={{ borderTop: "1px dashed var(--line)" }}
      >
        <span className="font-mono text-[11px] text-[var(--ink-3)]">
          gather · feedback pulse · pseudonymous
        </span>
        <span className="font-mono text-[11px] text-[var(--ink-3)]">
          {config.businessName}
        </span>
      </footer>
    </div>
  )
}
