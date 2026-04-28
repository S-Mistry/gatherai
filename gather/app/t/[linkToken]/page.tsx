import Link from "next/link"
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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "auto 1fr auto",
      }}
    >
      <AppBar
        crumb={[{ label: `${config.businessName} feedback` }]}
        right={
          <span className="chip sage">
            <span className="dot" />
            voice review
          </span>
        }
      />
      <main
        style={{
          display: "grid",
          placeItems: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ maxWidth: 760, width: "100%" }}>
          <TestimonialCaptureShell config={config} />
        </div>
      </main>
      <footer
        style={{
          padding: "20px 36px",
          borderTop: "1px dashed var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <span className="font-mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
          gather · feedback pulse · pseudonymous
        </span>
        <Link
          href="/"
          className="font-hand"
          style={{ fontSize: 18, color: "var(--ink-3)" }}
        >
          skip → I&apos;d rather not answer
        </Link>
      </footer>
    </div>
  )
}
