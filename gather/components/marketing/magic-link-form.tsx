"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
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
  message: "We will send a magic link to the email address you use as the consultant login.",
}

export function MagicLinkForm({ action }: MagicLinkFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Consultant email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="sunil@example.com"
          required
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending link..." : "Send magic link"}
      </Button>

      <p
        className={`text-sm leading-6 ${
          state.status === "error" ? "text-rose-600" : "text-muted-foreground"
        }`}
      >
        {state.message}
      </p>
    </form>
  )
}
