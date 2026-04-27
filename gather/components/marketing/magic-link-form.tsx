"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

interface MagicLinkState {
  status: "idle" | "success" | "error"
  message: string
}

interface MagicLinkFormProps {
  action: (
    state: MagicLinkState,
    formData: FormData
  ) => Promise<MagicLinkState>
}

const initialState: MagicLinkState = {
  status: "idle",
  message: "We'll send a magic link to your consultant email.",
}

export function MagicLinkForm({ action }: MagicLinkFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-7">
      <Field label="consultant email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="sunil@example.com"
          required
        />
      </Field>

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending link..." : "Send magic link →"}
      </Button>

      <p
        className="font-sans"
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          color: state.status === "error" ? "var(--rose)" : "var(--ink-3)",
          margin: 0,
        }}
      >
        {state.message}
      </p>
    </form>
  )
}
