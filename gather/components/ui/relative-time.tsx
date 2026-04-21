"use client"

import { useSyncExternalStore } from "react"

interface RelativeTimeProps {
  date: string | Date
  className?: string
}

const MINUTE = 60
const HOUR = MINUTE * 60
const DAY = HOUR * 24
const WEEK = DAY * 7

let currentNow = Date.now()
const subscribers = new Set<() => void>()
let ticker: number | null = null

function notify() {
  subscribers.forEach((listener) => listener())
}

function startTicker() {
  if (ticker !== null) {
    return
  }

  currentNow = Date.now()
  ticker = window.setInterval(() => {
    currentNow = Date.now()
    notify()
  }, 30_000)
}

function stopTicker() {
  if (ticker === null) {
    return
  }

  window.clearInterval(ticker)
  ticker = null
}

function subscribe(listener: () => void) {
  subscribers.add(listener)
  startTicker()

  return () => {
    subscribers.delete(listener)
    if (subscribers.size === 0) {
      stopTicker()
    }
  }
}

function format(target: Date, now: number): string {
  const diff = Math.round((now - target.getTime()) / 1000)
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
  const target = typeof date === "string" ? new Date(date) : date
  const now = useSyncExternalStore(subscribe, () => currentNow, () => currentNow)
  const label = format(target, now)

  return (
    <time
      dateTime={target.toISOString()}
      title={target.toLocaleString()}
      className={className}
    >
      {label}
    </time>
  )
}
