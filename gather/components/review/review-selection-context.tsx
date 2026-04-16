"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

export type DrawerMode = "evidence" | "transcript"

interface ReviewSelectionValue {
  hoveredSegmentIds: ReadonlySet<string>
  activeSegmentIds: ReadonlySet<string>
  setHovered: (segmentIds: string[] | null) => void
  focusSegments: (segmentIds: string[]) => void
  registerSegment: (id: string, node: HTMLElement) => void
  unregisterSegment: (id: string, node: HTMLElement) => void
  drawerOpen: boolean
  drawerMode: DrawerMode
  drawerSegmentIds: ReadonlySet<string>
  openDrawer: (mode: DrawerMode, segmentIds?: string[]) => void
  closeDrawer: () => void
  toggleDrawer: (mode: DrawerMode) => void
}

const ReviewSelectionContext = createContext<ReviewSelectionValue | null>(null)

export function ReviewSelectionProvider({ children }: { children: ReactNode }) {
  const [hoveredSegmentIds, setHoveredSegmentIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [activeSegmentIds, setActiveSegmentIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<DrawerMode>("evidence")
  const [drawerSegmentIds, setDrawerSegmentIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const segmentNodes = useRef(new Map<string, Set<HTMLElement>>())
  const activeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFocus = useRef<string[] | null>(null)

  const setHovered = useCallback((segmentIds: string[] | null) => {
    setHoveredSegmentIds(segmentIds ? new Set(segmentIds) : new Set())
  }, [])

  const scrollAndFlash = useCallback((segmentIds: string[]) => {
    if (segmentIds.length === 0) {
      return
    }
    const firstId = segmentIds[0]
    const set = segmentNodes.current.get(firstId)
    let target: HTMLElement | undefined
    if (set && set.size > 0) {
      const nodes = Array.from(set)
      target = nodes.find((n) => n.offsetParent !== null) ?? nodes[0]
    }
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" })
    } else {
      pendingFocus.current = segmentIds
    }
    setActiveSegmentIds(new Set(segmentIds))
    if (activeTimer.current) {
      clearTimeout(activeTimer.current)
    }
    activeTimer.current = setTimeout(() => {
      setActiveSegmentIds(new Set())
    }, 1800)
  }, [])

  const focusSegments = useCallback(
    (segmentIds: string[]) => {
      scrollAndFlash(segmentIds)
    },
    [scrollAndFlash]
  )

  const openDrawer = useCallback(
    (mode: DrawerMode, segmentIds?: string[]) => {
      setDrawerMode(mode)
      setDrawerOpen(true)
      if (mode === "evidence" && segmentIds && segmentIds.length > 0) {
        setDrawerSegmentIds(new Set(segmentIds))
        pendingFocus.current = segmentIds
      } else {
        setDrawerSegmentIds(new Set())
      }
    },
    []
  )

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
  }, [])

  const toggleDrawer = useCallback(
    (mode: DrawerMode) => {
      setDrawerOpen((open) => {
        if (open && mode === drawerMode) {
          return false
        }
        setDrawerMode(mode)
        if (mode === "transcript") {
          setDrawerSegmentIds(new Set())
        }
        return true
      })
    },
    [drawerMode]
  )

  const registerSegment = useCallback((id: string, node: HTMLElement) => {
    const map = segmentNodes.current
    let set = map.get(id)
    if (!set) {
      set = new Set()
      map.set(id, set)
    }
    set.add(node)
    if (pendingFocus.current && pendingFocus.current[0] === id) {
      const ids = pendingFocus.current
      pendingFocus.current = null
      requestAnimationFrame(() => scrollAndFlash(ids))
    }
  }, [scrollAndFlash])

  const unregisterSegment = useCallback((id: string, node: HTMLElement) => {
    const map = segmentNodes.current
    const set = map.get(id)
    if (!set) {
      return
    }
    set.delete(node)
    if (set.size === 0) {
      map.delete(id)
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || !drawerOpen) {
        return
      }
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }
      setDrawerOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [drawerOpen])

  const value = useMemo<ReviewSelectionValue>(
    () => ({
      hoveredSegmentIds,
      activeSegmentIds,
      setHovered,
      focusSegments,
      registerSegment,
      unregisterSegment,
      drawerOpen,
      drawerMode,
      drawerSegmentIds,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    }),
    [
      hoveredSegmentIds,
      activeSegmentIds,
      setHovered,
      focusSegments,
      registerSegment,
      unregisterSegment,
      drawerOpen,
      drawerMode,
      drawerSegmentIds,
      openDrawer,
      closeDrawer,
      toggleDrawer,
    ]
  )

  return (
    <ReviewSelectionContext.Provider value={value}>
      {children}
    </ReviewSelectionContext.Provider>
  )
}

export function useReviewSelection(): ReviewSelectionValue {
  const ctx = useContext(ReviewSelectionContext)
  if (!ctx) {
    throw new Error(
      "useReviewSelection must be used inside <ReviewSelectionProvider>"
    )
  }
  return ctx
}

export function useOptionalReviewSelection(): ReviewSelectionValue | null {
  return useContext(ReviewSelectionContext)
}
