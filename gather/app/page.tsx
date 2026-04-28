import Link from "next/link"

import { AppBar } from "@/components/ui/app-bar"
import { Button } from "@/components/ui/button"
import { StickyNote, Tape } from "@/components/ui/ornaments"

export default function Page() {
  return (
    <div className="min-h-screen">
      <AppBar
        right={
          <>
            <Link
              href="/sign-in"
              className="font-sans text-sm text-[var(--ink-2)] hover:text-[var(--ink)]"
            >
              Sign in
            </Link>
            <Button asChild variant="clay" size="sm">
              <Link href="/sign-in">Open workspace</Link>
            </Button>
          </>
        }
      />

      <main className="mx-auto max-w-[1280px] px-8 pt-16 pb-24 lg:px-12">
        <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="font-hand mb-4 text-[28px] text-[var(--clay)]">
              listening, made portable —
            </div>
            <h1
              className="font-serif"
              style={{
                fontSize: 64,
                fontWeight: 400,
                lineHeight: 1.02,
                letterSpacing: "-0.02em",
                margin: "0 0 24px",
              }}
            >
              Better interviews.{" "}
              <span style={{ fontStyle: "italic", color: "var(--clay)" }}>
                Without
              </span>{" "}
              you running every one.
            </h1>
            <p
              className="font-serif text-[var(--ink-2)]"
              style={{ fontSize: 22, lineHeight: 1.5, maxWidth: 560 }}
            >
              Share one link. A thoughtful interviewer speaks with each person and
              hands you themes, contradictions, and the quotes underneath them —
              every claim traceable to a real transcript.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-in">Open workspace →</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/sign-in">See what respondents see</Link>
              </Button>
            </div>

            <div className="mt-10 flex items-center gap-3.5">
              <span className="chip">
                <span className="dot" />
                Browser-only
              </span>
              <span className="chip">Transcript-backed themes</span>
              <span className="chip">Evidence drawer on every claim</span>
            </div>
          </div>

          <div className="relative">
            <div
              className="card flat relative"
              style={{ padding: "30px 32px" }}
            >
              <Tape className="left-1/2" style={{ top: -11, transform: "translateX(-50%) rotate(2deg)" }} />
              <div className="font-hand text-[26px] text-[var(--clay)]">
                what we heard —
              </div>
              <h3
                className="font-serif"
                style={{
                  fontSize: 38,
                  fontWeight: 400,
                  lineHeight: 1.1,
                  margin: "10px 0 18px",
                  letterSpacing: "-0.012em",
                }}
              >
                <span style={{ color: "var(--ink-2)" }}>Seven voices.</span>
                <br />
                <span style={{ fontStyle: "italic", color: "var(--clay)" }}>
                  One
                </span>{" "}
                unresolved decision.
              </h3>
              <p
                className="font-sans"
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                  margin: 0,
                }}
              >
                Synthesis pulls themes from every transcript — and every theme
                opens a drawer with the quotes that prove it.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <span className="chip clay">
                  <span className="dot" />
                  6/7 interviews
                </span>
                <span className="chip">5 themes</span>
                <span className="chip rose">2 contradictions</span>
              </div>
            </div>

            <div
              className="absolute"
              style={{ right: -18, bottom: -42, transform: "rotate(4deg)" }}
            >
              <StickyNote tint="sage">
                <div
                  className="font-hand"
                  style={{ fontSize: 20, lineHeight: 1.3 }}
                >
                  send one link today —<br />
                  see patterns as responses land.
                </div>
              </StickyNote>
            </div>
          </div>
        </section>

        <section className="mt-32 grid gap-8 lg:grid-cols-3">
          <Pillar
            eyebrow="01 · setup"
            title="One link, sent wide."
            body="Write the objective, list the questions, send one link. Stakeholder interviews and feedback pulses share the same calm front door."
          />
          <Pillar
            eyebrow="02 · conversation"
            title="Voice, not forms."
            body="Respondents press a button and talk. The interviewer adapts on the fly, follows up where it matters, and captures the useful details."
          />
          <Pillar
            eyebrow="03 · synthesis"
            title="Evidence underneath."
            body="Themes, contradictions and quotes — each one anchored to the surrounding transcript. The drawer on every claim is the whole point."
          />
        </section>

        <section className="mt-32 grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="font-hand text-[24px] text-[var(--clay)]">
              ready when you are —
            </div>
            <h2
              className="font-serif"
              style={{
                fontSize: 44,
                fontWeight: 400,
                lineHeight: 1.08,
                letterSpacing: "-0.012em",
                margin: "8px 0 16px",
              }}
            >
              Sign in. Set up a project. Send one link.
            </h2>
            <p
              className="font-sans"
              style={{
                fontSize: 15,
                lineHeight: 1.65,
                color: "var(--ink-2)",
                maxWidth: 520,
              }}
            >
              Restaurants, retros, launches, learning programs — anywhere honest
              signal is hard to gather and easy to lose. Catch it while the
              experience is still fresh.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-in">Open workspace →</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/sign-in">See respondent view</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

function Pillar({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div className="card flat" style={{ padding: "26px 28px" }}>
      <span className="eyebrow">{eyebrow}</span>
      <h3
        className="font-serif mt-3"
        style={{
          fontSize: 26,
          fontWeight: 400,
          lineHeight: 1.18,
          letterSpacing: "-0.005em",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <p
        className="font-sans"
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: "var(--ink-2)",
          marginTop: 12,
          marginBottom: 0,
        }}
      >
        {body}
      </p>
    </div>
  )
}
