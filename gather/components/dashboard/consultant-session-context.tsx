"use client"

import { createContext, useContext, type ReactNode } from "react"

export interface ConsultantSession {
  userEmail: string | null
  demoMode: boolean
}

const ConsultantSessionContext = createContext<ConsultantSession | null>(null)

export function ConsultantSessionProvider({
  value,
  children,
}: {
  value: ConsultantSession
  children: ReactNode
}) {
  return (
    <ConsultantSessionContext.Provider value={value}>
      {children}
    </ConsultantSessionContext.Provider>
  )
}

export function useConsultantSession(): ConsultantSession {
  const value = useContext(ConsultantSessionContext)
  if (!value) {
    return { userEmail: null, demoMode: false }
  }
  return value
}
