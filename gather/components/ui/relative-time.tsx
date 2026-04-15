"use client"

import { useEffect, useMemo, useState } from "react"

interface RelativeTimeProps {
  date: string | Date
  className?: string
}

const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24
const WEEK = DAY * 7

function format(target: Date): string {
  const diff = Math.round((Date.now() - target.getTime()) / 1000)
  const abs = Math.abs(diff)
  const future = diff < 0

  if (abs < 45) return future ? "in a moment" : "just now"
  if (abs < HOUR) {
    const minutes = Math.round(abs / MINUTE)
    return future ? `in ${minutes} min` : `${minutes} min ago`
  }
  if (abs < DAY) {
    const hours = Math.round(abs / HOUR)
    return future ? `in ${hours} hr` : `${hours} hr ago`
  }
  if (abs < WEEK) {
    const days = Math.round(abs / DAY)
    return future ? `in ${days} day${days === 1 ? "" : "s"}` : `${days} day${days === 1 ? "" : "s"} ago`
  }
  return target.toLocaleDateString()
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const target = useMemo(
    () => (typeof date === "string" ? new Date(date) : date),
    [date]
  )
  const [label, setLabel] = useState(() => format(target))

  useEffect(() => {
    const id = window.setInterval(() => setLabel(format(target)), 30_000)
    return () => window.clearInterval(id)
  }, [target])

  return (
    <time dateTime={target.toISOString()} title={target.toLocaleString()} className={className}>
      {label}
    </time>
  )
}
